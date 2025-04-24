import './App.css';
import { get_table_info, reset_counter } from './api.js';
import { useState, useEffect, useCallback } from 'react';
import "./style.css"

const handleResetCounter = async (ponto) => {
  try{
    const res = await reset_counter(ponto)
    console.log(res)
  }
  catch (err){
    console.log("Erro ao buscar os dados: ", err)
  }
}




function formatContent(info){
  let entradas = 0;
  let saidas = 0;
  const content = info.map((item) => {
    entradas += item.ba
    saidas += item.ab
    return (
      <div className="contagem-container" id={item.ponto}>
        <ul className="cont-list">
          <li><span className="title">Ponto:</span> <span className="value">{item.ponto}</span></li>
          <li><span className="title">Saiu:</span> <span className="value">{JSON.stringify(item.ab)}</span></li>
          <li><span className="title">Entrou:</span> <span className="value">{JSON.stringify(item.ba)}</span></li>
          <li><button className="button" onClick={() => handleResetCounter(item.ponto)}>Zerar Contador</button></li>
        </ul>
      </div>
    )
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


function App() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar os dados

  const fetchInfo = useCallback(async () => {
    try {
      
      const info_db = await get_table_info();
      setInfo(formatContent(info_db));
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      
    }
  }, []);

  // Busca inicial + intervalo para atualização
  useEffect(() => {
    fetchInfo(); // chamada inicial
    const intervalId = setInterval(fetchInfo, 1000); // atualiza a cada segundo
    return () => clearInterval(intervalId); // limpa ao desmontar
  }, [fetchInfo]);

  return (
    <div className="contagem">
      
      <h1>Contagem</h1>

      <div style={{textAlign:'center'}} >
        
        {info}
        {!info && <p>Nenhuma informação disponível.</p>}
       
      </div>
    </div>
  );
}

export default App;
