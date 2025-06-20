import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation } from "react-router-dom";
import "../styles/videoconf.css";
import { start_contagem, stop_contagem, get_info_cam, reset_counter, restart_machine } from '../api';
import ConfirmPopUp from './popup/confirm';

let ponto, port;
let firstTime = true;

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
    port = params.get('port');

    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]); // Armazena os dois cliques
    const [pontoStats, setPontoStats] = useState('');
    const [displayConfirmPopUp, setDisplayConfirmPopUp] = useState(false);
    const [countingActive, setCountingActive] = useState(false);
    const [direction, setDirection] = useState(0);
  
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
    }

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
      }
      else{

        const p1 = [points[0].x, points[0].y];
        const p2 = [points[1].x, points[1].y];
        const msg = await start_contagem(ponto, JSON.stringify(p1), JSON.stringify(p2), direction);
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

    const restartMachine = async (ponto) => {
      try{
        const res = await restart_machine(ponto);
      }
      catch (err) {
        console.log(err)
      }
    } 

    const ResetCounter = async (ponto) => {
      try{
        const res = await reset_counter(ponto);
      
      }
      catch (err){
        console.log("Erro ao buscar os dados: ", err);
      }
      setDisplayConfirmPopUp(false);
    }

    const fetchInfo = useCallback(async () => {
    
        
      const info_db = await get_info_cam(ponto);
      if(info_db && info_db.length > 0){
        const info_cam = info_db[0]
        if (firstTime && info_cam.p1 && info_cam.p2){
          firstTime = false;
          let p1 = JSON.parse(info_cam.p1)
          let p2 = JSON.parse(info_cam.p2)
          const conv = {x: 800/1920, y: 450/1080}  
          p1 = {x: p1[0], y: p1[1]}
          p2 = {x: p2[0], y: p2[1]}
          setPoints([p1,p2])
          setTimeout(() => drawLine(p1, p2), 500)
          
        }
        if(info_db[0].state === 0) setCountingActive(true)   
        else setCountingActive(false)

        setPontoStats(formatContent(info_db[0]));
        
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

          <p><strong>Entrou no sentido: </strong>
            <label htmlFor='direction'></label>
            <select onChange={(event) => {
              let bool;
              if(event.target.value === 'ab'){
                bool = 0
              }
              else bool = 1;
              setDirection(bool);
            }}>
              <option value="ab">A -&gt; B</option>
              <option value="ba">B -&gt; A</option>
            </select>
          </p>
          <div style={{ marginTop: '20px' }}>


            {!countingActive && <button className='buttons' onClick={setContagemOn}>Ativar Contagem</button>}
            {countingActive && 
              <div>
                <div style={{paddingBottom: '10px'}}>
                  <p1>Aperte em "Reiniciar" para salvar alterações</p1>
                </div>
                
                <button className='buttons' onClick={setContagemOff}>Desativar Contagem</button>
                <button className='buttons' onClick={() => restartMachine(ponto)}>Reiniciar</button>
                <button className='buttons' onClick={() => setDisplayConfirmPopUp(true)}>Zerar Contador</button>
              </div>
            }
    
          </div>
        </div>
        {displayConfirmPopUp && <ConfirmPopUp info={"Deseja mesmo reiniciar o contador?"} onClose={() => setDisplayConfirmPopUp(false)} color="red" Confirm={() => ResetCounter(ponto)}/>}
      </div>

    );
}

export default VideoViewer;
