import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation } from "react-router-dom";
import "../styles/videoconf.css";
import { start_contagem, stop_contagem, get_info_cam, reset_counter, restart_machine, remove_stream, watch_stream } from '../api';
import ConfirmPopUp from './popup/confirm';
import NotifyPopUp from './popup/editNotify';
// import WebSocketClient from '../websocket'; // Não estava sendo usado no snippet original

let ponto;
let firstTime = true;

// --- COMPONENTE INTERNO PARA WEBRTC NATIVO (WHEP) ---
const WebRTCPlayer = ({ url, onStatsUpdate }) => {
    const videoRef = useRef(null);
    const pcRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        
        const startStream = async () => {
            if (!url) return;

            // TRATAMENTO DE URL PARA MEDIAMTX (WHEP)
            // Se a URL não termina com /whep, adicionamos.
            // Ex: http://192.168.1.5:8889/cam1 -> http://192.168.1.5:8889/cam1/whep
            let whepUrl = url;
            if (!whepUrl.endsWith('/whep')) {
                // Remove barra final se existir antes de adicionar /whep
                whepUrl = whepUrl.endsWith('/') ? whepUrl.slice(0, -1) : whepUrl;
                whepUrl = `${whepUrl}/whep`;
            }

            console.log(`Iniciando conexão WHEP. Original: ${url} | Ajustada: ${whepUrl}`);

            // 1. Configuração do PeerConnection
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            pcRef.current = pc;

            // Debug de estado da conexão
            pc.onconnectionstatechange = () => console.log("WebRTC Connection State:", pc.connectionState);
            pc.oniceconnectionstatechange = () => console.log("WebRTC ICE State:", pc.iceConnectionState);

            // 2. Configurar transceivers para receber apenas
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            // 3. Quando a track chegar, jogar no elemento video
            pc.ontrack = (event) => {
                console.log("Track recebida:", event.track.kind);
                if (videoRef.current && event.streams[0]) {
                    videoRef.current.srcObject = event.streams[0];
                    // Forçar play caso o autoplay falhe
                    videoRef.current.play().catch(e => console.error("Erro ao dar play:", e));
                }
            };

            try {
                // 4. Criar Offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // --- CRÍTICO: AGUARDAR COLETA DE CANDIDATOS ICE ---
                // Necessário para descobrir a rota UDP (webrtcLocalUDPAddress)
                if (pc.iceGatheringState !== 'complete') {
                    await new Promise(resolve => {
                        const checkState = () => {
                            if (pc.iceGatheringState === 'complete') {
                                pc.removeEventListener('icegatheringstatechange', checkState);
                                resolve();
                            }
                        };
                        pc.addEventListener('icegatheringstatechange', checkState);
                        // Timeout de segurança
                        setTimeout(() => {
                            pc.removeEventListener('icegatheringstatechange', checkState);
                            resolve();
                        }, 2000);
                    });
                }
                
                const offerWithCandidates = pc.localDescription;

                // 5. Negociação WHEP (POST do SDP para o MediaMTX)
                console.log("Enviando Offer WHEP para:", whepUrl);
                const response = await fetch(whepUrl, {
                    method: 'POST',
                    body: offerWithCandidates.sdp,
                    headers: { 'Content-Type': 'application/sdp' }
                });

                if (!response.ok) throw new Error(`Erro WHEP (${response.status}): Verifique se o MediaMTX está rodando e se a URL está correta.`);

                const answerSdp = await response.text();
                console.log("Recebido Answer WHEP");
                
                if (isMounted && pc.signalingState !== 'closed') {
                    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
                }

            } catch (err) {
                console.error("Erro na conexão WebRTC:", err);
            }
        };

        startStream();

        // Monitoramento de Stats
        const intervalId = setInterval(async () => {
            if (pcRef.current && pcRef.current.connectionState === 'connected') {
                const stats = await pcRef.current.getStats();
                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        // Busca o report do Codec usando o ID fornecido no report RTP
                        const codecId = report.codecId;
                        const codec = stats.get(codecId);

                        if (onStatsUpdate) {
                             onStatsUpdate({
                                width: report.frameWidth,
                                height: report.frameHeight,
                                fps: Math.round(report.framesPerSecond || 0),
                                codec: codec ? codec.mimeType : '' // Ex: "video/H264" ou "video/VP8"
                             });
                        }
                    }
                });
            }
        }, 2000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            if (pcRef.current) {
                pcRef.current.close();
            }
        };
    }, [url, onStatsUpdate]);

    return (
        <video 
            ref={videoRef}
            autoPlay 
            muted 
            playsInline
            controls={false} // Remove controles nativos para não poluir
            style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'fill', 
                backgroundColor: '#000' 
            }} 
        />
    );
};
// ----------------------------------------------------

function formatContent(info){
    const states = ['cotagem ativada', 'aguardando contagem', '', 'modo stream'];
    return (
      <div>
        <p><strong>IP:</strong> {info.ip}</p>
        <p><strong>Estado:</strong> {states[info.state]}</p>
        {info.state===0 &&  
        <div>
          {info.direction === 0 && 
            <div>
              <p><strong>Entraram:</strong> {info.ab}</p> 
              <p><strong>Saíram:</strong> {info.ba}</p>
            </div>}
          {info.direction === 1 && 
            <div>
              <p><strong>Entraram:</strong> {info.ba}</p> 
              <p><strong>Saíram:</strong> {info.ab}</p>
            </div>}
        </div>}
      </div>
    )
}

function VideoViewer() {
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    ponto = params.get('ponto');
    const initialUrl = params.get('url_webrtc');

    const [streamURL, setStreamURL] = useState(initialUrl);
    const [isRestarting, setIsRestarting] = useState(false);
    // Adicionado campo 'codec' ao estado inicial
    const [streamStats, setStreamStats] = useState({ width: 0, height: 0, fps: 0, codec: '' }); 
    
    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]);
    const [pontoStats, setPontoStats] = useState('');
    const [displayConfirmPopUp, setDisplayConfirmPopUp] = useState(false);
    const [displayNotifyPopUp, setDisplayNotifyPopUp] = useState(false);
    const [countingActive, setCountingActive] = useState(false);
    const [direction, setDirection] = useState(0);
    const [hour, setHour] = useState({start: '', end: ''});
    const [ShowHours, setShowHours] = useState(false);
    const pontoData = useRef(null);
    const streamNumber = useRef(1);

    const restartStream = async (ponto) => {
      setIsRestarting(true);
      try {
        const [data] = pontoData.current;
        console.log("Reiniciando stream para:", data);
        await remove_stream(ponto);
        
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const payload = await watch_stream(data.ip, ponto, data.tipo, data.fabricante, streamNumber);
        if (payload && payload.url_webrtc) {
            setStreamURL(payload.url_webrtc);
        } else {
            console.error("Não foi possível obter a nova URL da stream.");
            alert("Falha ao reiniciar a stream. Verifique o console.");
        }
      } catch (err) {
        console.error("Erro ao reiniciar a stream:", err);
        alert("Ocorreu um erro durante o reinício da stream.");
      } finally {
        setIsRestarting(false);
      }
    };

    const handleSetHour  = (e, which) => {
        setHour(prev => ({ ...prev, [which]: e.target.value }));
    };
    
    const closePopUpNotify = () => {
      setHour({start: '', end: ''});
      setDisplayNotifyPopUp(false);
      setShowHours(false);
    };

    const confirmPopUpNotify = () => {
      setDisplayNotifyPopUp(false);
      if(hour.start !== '' && hour.end !== ''){
        setShowHours(true);
      }
    };
    
    const getMousePos = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      // Ajuste para garantir precisão se o canvas tiver escala CSS diferente do tamanho real
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };
  
    const handleClick = (e) => {
      if (points.length >= 2) return;
      const pos = getMousePos(e);
      const newPoints = [...points, pos];
      if (newPoints.length === 2) {
        drawLine(newPoints[0], newPoints[1]);
      }
      setPoints(newPoints);
    };
  
    const findABpositions = (p1, p2, dist, font) => {
      let midPoint = {x: parseInt((p1.x+p2.x)/2), y: parseInt((p1.y+p2.y)/2)}
      let a = p1;
      let b = p2;
      // Tratamento de divisão por zero se x for igual
      let angle = (b.x - a.x) === 0 ? Math.PI / 2 : Math.atan((b.y - a.y)/(b.x - a.x));
      
      let A = {
        x: parseInt(midPoint.x + Math.sin(angle)*dist), 
        y: parseInt(midPoint.y - Math.cos(angle)*dist)}
      let B = {
        x: parseInt(midPoint.x - Math.sin(angle)*dist), 
        y: parseInt(midPoint.y + Math.cos(angle)*dist) + parseInt(0.7*font)}
      return [A, B]
    };

    const drawLine = (p1, p2) => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      let [A, B] = findABpositions(p1, p2, 40, 30);
      ctx.font = '30px Arial';
      ctx.fillStyle = 'blue';
      ctx.fillText("A", A.x, A.y);
      ctx.fillText("B", B.x, B.y);
    };
  
    const handleReset = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setPoints([]);
    };

    const setContagemOn = async () => {
      if (points.length < 2){
        alert("Trace a linha para ativar");
      } else {
        const [data] = pontoData.current;
        const p1 = [points[0].x, points[0].y];
        const p2 = [points[1].x, points[1].y];
        const msg = await start_contagem(ponto, JSON.stringify(p1), JSON.stringify(p2), direction, hour.start, hour.end, data.ip, data.tipo);
        if(msg) {
          alert(msg === 'Erro' ? "Houve um erro no banco de dados" : msg);
        } else {
          alert("Erro de conexão");
        }
      }
    };
    
    const setContagemOff = async () => {
      const msg = await stop_contagem(ponto);
      if(msg) {
        alert(msg === 'Erro' ? "Houve um erro no banco de dados" : msg);
      } else {
        alert("Erro de conexão");
      }
    };

    const restartMachine = async (ponto) => {
      try {
        await restart_machine(ponto);
      } catch (err) {
        console.log(err);
      }
    }; 

    const ResetCounter = async (ponto) => {
      try {
        await reset_counter(ponto);
      } catch (err){
        console.log("Erro ao buscar os dados: ", err);
      }
      setDisplayConfirmPopUp(false);
    };

    const fetchInfo = useCallback(async () => {
      const info_db = await get_info_cam(ponto);
      pontoData.current = info_db;
      if(info_db && info_db.length > 0){
        const info_cam = info_db[0];
        if (firstTime && info_cam.p1 && info_cam.p2){
          firstTime = false;
          let p1 = JSON.parse(info_cam.p1);
          let p2 = JSON.parse(info_cam.p2);
          p1 = {x: p1[0], y: p1[1]};
          p2 = {x: p2[0], y: p2[1]};
          setPoints([p1,p2]);
          setTimeout(() => drawLine(p1, p2), 500);
        }
        setCountingActive(info_db[0].state === 0);
        setPontoStats(formatContent(info_db[0]));
      } else {
        console.error("Erro ao buscar dados:");
        setPontoStats("Sem conexão com o servidor");
      }  
    }, []);

    useEffect(() => {
      fetchInfo();
      const intervalId = setInterval(fetchInfo, 1000);
      return () => clearInterval(intervalId);
    }, [fetchInfo]);
  
    return (
      <div className='container'>
        <div className='video' style={{position: 'relative', width: '800px', height: '450px'}}> 
          
          {isRestarting ? (
            <div style={{width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', color: '#fff'}}>
              <p>Reiniciando stream...</p>
            </div>
          ) : (
            <WebRTCPlayer 
                key={streamURL}
                url={streamURL} 
                onStatsUpdate={setStreamStats}
            />
          )}

          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, cursor: 'crosshair' }}
            onClick={handleClick}
          />
          
          {points.length === 2 && (
            <button
              onClick={handleReset}
              style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, padding: '6px 12px' }}
            >
              Redesenhar
            </button>
          )}

          {/* Overlay de Debug (Agora com o Codec) */}
          {streamStats.width > 0 && (
              <div style={{
                  position: 'absolute', 
                  bottom: 5, 
                  left: 5, 
                  zIndex: 15, 
                  background: 'rgba(0,0,0,0.6)', 
                  color: 'rgb(255,255,255)', 
                  fontSize: '12px',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  pointerEvents: 'none'
              }}>
                  {streamStats.width}x{streamStats.height} | FPS: {streamStats.fps} | {streamStats.codec}
              </div>
          )}
        </div>

        <div className='rightbar'>
          <h2>Status da Câmera</h2>
          <p><strong>Nome:</strong> {ponto}</p>
          {pontoStats}
          
          <p><strong>Entrou no sentido: </strong>
            <label htmlFor='direction'></label>
            <select onChange={(event) => setDirection(event.target.value === 'ab' ? 0 : 1)}>
              <option value="ab">A -&gt; B</option>
              <option value="ba">B -&gt; A</option>
            </select>
          </p>
          
          <p><strong>Número da stream</strong>
            <label htmlFor='streamNumber'></label>
            <input type="number" onChange={e => {streamNumber.current = e.target.value} }></input>
          </p>
          
          <div>
            {ShowHours && 
              <div>
                Configurado para monitorar das {hour.start} às {hour.end} horas
              </div>}
          </div>
          
          <div style={{ marginTop: '20px' }}>
            {!countingActive ? (
              <div>
                <button className='buttons' onClick={() => setDisplayNotifyPopUp(true)}>Monitorar</button>
                <button className='buttons' onClick={setContagemOn}>Ativar Contagem</button>
                <button className='buttons' onClick={() => restartStream(ponto)}>Reiniciar Stream</button>
              </div>
            ) : (
              <div>
                <div style={{paddingBottom: '10px'}}>
                  <p>Aperte em "Reiniciar" para salvar alterações</p>
                </div>
                <button className='buttons' onClick={setContagemOff}>Desativar Contagem</button>
                <button className='buttons' onClick={() => restartMachine(ponto)}>Reiniciar</button>
                <button className='buttons' onClick={() => setDisplayConfirmPopUp(true)}>Zerar Contador</button>
              </div>
            )}
          </div>
        </div>
        
        {displayConfirmPopUp && <ConfirmPopUp info={"Deseja mesmo reiniciar o contador?"} onClose={() => setDisplayConfirmPopUp(false)} color="red" Confirm={() => ResetCounter(ponto)}/>}
        {displayNotifyPopUp && <NotifyPopUp onClose={closePopUpNotify} color="green" Confirm={confirmPopUpNotify} handleSetHour={handleSetHour} hour={hour}/>}
      </div>
    );
}

export default VideoViewer;