
import { remove_cam, add_cam } from "../api";
import "../styles/style.css"
import { useState, useEffect, useCallback } from 'react';

function Teste(){
    
    const url1 = 'rtsp://bosch:Wnidobrasil!20@189.4.2.61:25552'
    const url2 = 'rtsp://bosch:Wnidobrasil!20@189.4.2.61:25553'
    return (
        <div style={{textAlign:"center"}}>
            <button onClick={() => window.location.href = url1}>abrir cam1</button>
            <button onClick={() => window.location.href = url2}>abrir cam2</button>
            <a href={url1}>Abrir no VLC</a>
        </div>        
        
        
        
        
        
   
    )
}


export default Teste;