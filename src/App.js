import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home.js';
import Manager from './components/Manager.js';
import VideoViewer from './components/VideoViewer.js';
import Teste from './components/Teste.js';
import WebSocketClient from './websocket.js';
import WebSocketListener from './WebSocketListener.js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';
import { toast } from 'react-toastify';


//const ws = new WebSocketClient('ws://localhost:7070')
//ws.connect()



function App() {

  /*useEffect(() => {
    setTimeout(() => {
      toast.success('Exemplo de notificação!');
    }, 1000);
    }, []);
  */
  return (

    <Router>
      <WebSocketListener />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
      />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path='/manager' element={<Manager/>}/>
        <Route path='/videoconf' element={<VideoViewer/>}/>
        <Route path='/teste' element={<Teste/>}/>
      </Routes>
    </Router>
   
  ) 
}

export default App;
