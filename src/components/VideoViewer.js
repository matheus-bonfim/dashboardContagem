import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation } from "react-router-dom";
import "../styles/videoconf.css";
import { start_contagem, stop_contagem, get_info_cam, reset_counter, restart_machine, remove_stream, watch_stream } from '../api';
import ConfirmPopUp from './popup/confirm';
import NotifyPopUp from './popup/editNotify';
import WebSocketClient from '../websocket';

let ponto;
let firstTime = true;

// A função formatContent permanece a mesma
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
    const [isRestarting, setIsRestarting] = useState(false); // NOVO ESTADO: controla o reinício da stream
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

    // FUNÇÃO MODIFICADA: para gerenciar o estado de reinício
    const restartStream = async (ponto) => {
      setIsRestarting(true); // Ativa o modo de carregamento na UI
      try {
        const [data] = pontoData.current;
        await remove_stream(ponto);
        
        // Pequeno atraso opcional para garantir que o servidor processou a remoção
        await new Promise(resolve => setTimeout(resolve, 200)); 

        const payload = await watch_stream(data.ip, ponto, data.tipo, data.fabricante);
        if (payload && payload.url_webrtc) {
            setStreamURL(payload.url_webrtc); // Atualiza a URL da stream
        } else {
            console.error("Não foi possível obter a nova URL da stream.");
            alert("Falha ao reiniciar a stream. Verifique o console.");
        }
      } catch (err) {
        console.error("Erro ao reiniciar a stream:", err);
        alert("Ocorreu um erro durante o reinício da stream.");
      } finally {
        setIsRestarting(false); // Desativa o modo de carregamento, mesmo se ocorrer um erro
      }
    };

    const handleSetHour  = (e, which) => {
        setHour(prev => ({
            ...prev,
            [which]: e.target.value
        }));
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
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
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
      let angle = Math.atan((b.y - a.y)/(b.x - a.x));
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
        <div className='video'>
          {/* JSX MODIFICADO: renderização condicional da stream */}
          {isRestarting ? (
            <div style={{width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', color: '#fff'}}>
              <p>Reiniciando stream, por favor aguarde...</p>
            </div>
          ) : (
            <iframe
              key={streamURL} // NOVO: Força a recriação do iframe quando a URL muda
              src={streamURL}
              width="100%"
              height="100%"
              style={{ border: 0, pointerEvents: 'none' }}
              allow="fullscreen"
              title="WebRTC Stream"
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

//marmelada