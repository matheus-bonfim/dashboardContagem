import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home.js';
import Manager from './components/Manager.js';
import VideoViewer from './components/VideoViewer.js';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path='/manager' element={<Manager/>}/>
        <Route path='/videoconf' element={<VideoViewer/>}/>
        
      </Routes>
    </Router>
   
  ) 
}

export default App;
