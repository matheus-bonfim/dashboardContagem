
import { remove_cam, add_cam } from "../api";
import "../styles/style.css"
import { useState, useEffect, useCallback } from 'react';

function Manager(){
    
    const [inPonto, setInPonto] = useState('');
    const [delPonto, setDelPonto] = useState('');

    async function deleteCam(ponto){
        if(ponto!='') {
            const res = await remove_cam(ponto);
            alert(res);
        }
    }
    async function insertCam(ponto){
        if(ponto!=''){
            const res = await add_cam(ponto);
            alert(res);
        }
    }





    return (
        <div style={{textAlign:"center"}}>
        <h1>Configurações</h1>
        <div>
            <ul className="cont-list">
                <li>
                    <span>Adicionar Câmera</span> <input onChange={(e) => setInPonto(e.target.value)}></input> <button onClick={() => insertCam(inPonto)}>Adicionar</button>  
                </li>
                <li>
                    <span>Deletar Câmera</span> <input onChange={(e) => setDelPonto(e.target.value)}></input> <button onClick={() => deleteCam(delPonto)}>Deletar</button>
                </li>
            </ul>
              
            
        </div>        
        
        
        
        
        
        </div>
    )
}


export default Manager;