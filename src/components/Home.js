import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { get_table_info, reset_counter, watch_stream } from '../api.js';
import { useState, useEffect, useCallback } from 'react';
import ConfirmPopUp from './popup/confirm.js';
import "../styles/style.css"

const IP_PUBLIC = '189.4.2.61';

function Home() {
  
  const [info, setInfo] = useState(null);
  const [ponto, setPonto] = useState(null);
  const [displayConfirmPopUp, setDisplayConfirmPopUp] = useState(false);

  // Função para buscar os dados
  const viewConfStream = async (ip, ponto, tipo, fabricante) => {
    const payload = await watch_stream(ip, ponto, tipo, fabricante);
    const url = `http://${IP_PUBLIC}:3000/videoconf?ponto=${ponto}&url_webrtc=${payload.url_webrtc}`;
    //const url = `http://localhost:3000/video2`;

    window.open(url, "_blank");
  }

  const openContagem = async () => {
    const url = 'http://189.4.2.61:3000/manager';
    window.open(url, "_blank");
  }

  const handleWatchStream = async (ip, ponto, tipo) => {
    const url = await getStreamURL(ip, ponto, tipo);
    if (url) window.open(url, "_blank");
    else alert("erro");
  }

  const getStreamURL = async (ip, ponto, tipo) => {
    const payload = await watch_stream(ip, ponto, tipo);
    if(payload){
      return payload.url_webrtc;
    }
    else return false;
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
  
  const HandleResetCounter = (ponto) => {
    setPonto(ponto);
    setDisplayConfirmPopUp(true);
  }

  function formatContent(info){
    let entradas = 0;
    let saidas = 0;
    const content = info.map((item) => {
      const states = ['cotagem ativada', 'aguardando contagem', '', 'modo stream']
      entradas += item.ba
      saidas += item.ab
      if(item.state !== 2){  // se estiver em processo de delete nao aparece 
        return (
          <div className="contagem-container" id={item.ponto}>
            <ul className="cont-list">
              <li><span className="title">Ponto :</span> <span className="value">{item.ponto}</span></li>
              <li><span className="title">IP :</span> <span className="value">{item.ip}</span></li>
              <li><span className="title">Estado :</span> <span className="value">{states[item.state]}</span></li>
              {item.state===0 && <div>
                <li><span className="title">Saiu :</span> <span className="value">{JSON.stringify(item.ab)}</span></li>
                <li><span className="title">Entrou :</span> <span className="value">{JSON.stringify(item.ba)}</span></li>
                <li><button className="button" onClick={() => {HandleResetCounter(item.ponto)}}>Zerar Contador</button></li>
              </div>
              }
              <li><button className="button" onClick={() => {handleWatchStream(item.ip, item.ponto, item.tipo)}}>Visualizar</button></li>
              
              <li><button className="button" onClick={() => {viewConfStream(item.ip, item.ponto, item.tipo, item.fabricante)}}>Configurar</button></li>
              
              
            </ul>
          </div>
        )
      }
      else return null;
    })
  
    
    return (
      <div>
        {content}
        <div className="contagem-container" id='result'>
          <ul className="cont-list" style={{backgroundColor:'rgb(82, 255, 139)'}}>
            <li><span className="title">Saíram:</span> <span className="value">{saidas}</span></li>
            <li><span className="title">Entraram:</span> <span className="value">{entradas}</span></li>
            <li><span className="title">No local:</span> <span className="value">{entradas - saidas}</span></li>
          </ul>
        </div>
      </div>
    )
  }
  

  const fetchInfo = useCallback(async () => {
  
      const info_db = await get_table_info();
      if(info_db){
        setInfo(formatContent(info_db));
      }
      else{
        console.error("Erro ao buscar dados:");
        setInfo("Sem conexão com o servidor");
      }
  }, []);


  useEffect(() => {
    fetchInfo(); // chamada inicial
    const intervalId = setInterval(fetchInfo, 1000); // atualiza a cada segundo
    return () => clearInterval(intervalId); // limpa ao desmontar
  }, [fetchInfo]);

  return (
    <div className="contagem">
      
      <h1>Contagem</h1>
      <div className='sidebar'>
        <button onClick={openContagem}>Configurações</button>
      </div>
      <div style={{textAlign:'center'}} >
        
        {info}
        {!info && <p>Nenhuma informação disponível.</p>}
        {displayConfirmPopUp && <ConfirmPopUp info={"Deseja mesmo reiniciar o contador?"} onClose={() => setDisplayConfirmPopUp(false)} color="red" Confirm={() => ResetCounter(ponto)}/>}
       
      </div>
    </div>
  );
}

export default Home;
