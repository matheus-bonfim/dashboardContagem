import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation } from "react-router-dom";
import "../styles/videoconf.css";
import { start_contagem, stop_contagem, get_info_cam, reset_counter } from '../api';
import ConfirmPopUp from './popup/confirm';

let ponto, port;



function formatContent(info){
    const states = ['cotagem ativada', 'aguardando contagem', '', 'modo stream'];
    return (
      <div>
        <p><strong>IP:</strong> {info.ip}</p>
        <p><strong>Estado:</strong> {states[info.state]}</p>
        {info.state===0 &&  
        <div>
          <p><strong>Entraram:</strong> {info.ab}</p> 
          <p><strong>Saíram:</strong> {info.ba}</p>
        </div>}
      </div>
    )
}


function VideoViewer() {
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    ponto = params.get('ponto');
    port = params.get('port');

    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]); // Armazena os dois cliques
    const [pontoStats, setPontoStats] = useState('');
    const [displayConfirmPopUp, setDisplayConfirmPopUp] = useState(false);
  
    const getMousePos = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
  

    const handleClick = (e) => {
      if (points.length >= 2) return; // Já desenhou
  
      const pos = getMousePos(e);
      const newPoints = [...points, pos];
  
      if (newPoints.length === 2) {
        drawLine(newPoints[0], newPoints[1]);
        console.log(newPoints[0], newPoints[1]);
      }
  
      setPoints(newPoints);
    };
  
    const drawLine = (p1, p2) => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.closePath();
    };
  
    const handleReset = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setPoints([]);
    };

    const setContagemOn = async () => {
      if (points.length < 2){
        alert("Trace a linha para ativar");
      }
      else{
        const p1 = [points[0].x, points[0].y];
        const p2 = [points[1].x, points[1].y];

        const msg = await start_contagem(ponto, JSON.stringify(p1), JSON.stringify(p2));
        if(msg){
          if(msg === 'Erro'){
            alert("Houve um erro no banco de dados");
          }
          else{
            alert(msg);
          }
        }
        else{
          alert("Erro de conexão")
        }
      }
    }
    const setContagemOff = async () => {
      const msg = await stop_contagem(ponto);
      if(msg){
        if(msg === 'Erro'){
          alert("Houve um erro no banco de dados");
        }
        else{
          alert(msg);
        }
      }
      else{
        alert("Erro de conexão")
      }
    }

    const HandleResetCounter = (ponto) => {
      setDisplayConfirmPopUp(true);
    }

    const ResetCounter = async (ponto) => {
      try{
        const res = await reset_counter(ponto);
        console.log(res);
      }
      catch (err){
        console.log("Erro ao buscar os dados: ", err);
      }
      setDisplayConfirmPopUp(false);
    }

    const fetchInfo = useCallback(async () => {
    
        
      const info_db = await get_info_cam(ponto);
      if(info_db){
        setPontoStats(formatContent(info_db[0]));
        console.log(info_db[0]);
      }
      else{
        console.error("Erro ao buscar dados:");
        setPontoStats("Sem conexão com o servidor");
      }  
    }, []);


    useEffect(() => {
      fetchInfo(); // chamada inicial
      const intervalId = setInterval(fetchInfo, 1000); // atualiza a cada segundo
      return () => clearInterval(intervalId); // limpa ao desmontar
    }, [fetchInfo]);
  
    
    const urlStream = `http://localhost:${port}/${ponto}`;

    return (
      <div className='container'>
  
        <div className='video'>
          <iframe
            src={urlStream}
            width="100%"
            height="100%"
            style={{ border: 0, pointerEvents: 'none' }}
            allow="fullscreen"
            title="WebRTC Stream"
          />
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 10,
              cursor: 'crosshair',
            }}
            onClick={handleClick}
          />
          {points.length === 2 && (
            <button
              onClick={handleReset}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 20,
                padding: '6px 12px',
              }}
            >
              Redesenhar
            </button>
          )}
        </div>
        <div className='rightbar'>
          <h2>Status da Câmera</h2>
          <p><strong>Nome:</strong> {ponto}</p>
          {pontoStats}


          <div style={{ marginTop: '20px' }}>
            <button className='buttons' onClick={setContagemOn}>Ativar Contagem</button>
            <button className='buttons' onClick={setContagemOff}>Desativar Contagem</button>
            <button className='buttons' onClick={() => setDisplayConfirmPopUp(true)}>Zerar Contador</button>

          </div>
        </div>
        {displayConfirmPopUp && <ConfirmPopUp info={"Deseja mesmo reiniciar o contador?"} onClose={() => setDisplayConfirmPopUp(false)} color="red" Confirm={() => ResetCounter(ponto)}/>}
      </div>

    );
}

export default VideoViewer;
