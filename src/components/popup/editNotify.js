import '../../styles/PopUp.css';

export const NotifyPopUp = ({onClose, Confirm, color, handleSetHour, hour}) => {
  
  const close = () => {
    onClose();
    //if(goBack) goBack();
  }

  const confirm = () => {

    Confirm();
  }
  
  if(color === 'green'){
    var hcolor = '#28a745';
  }
  else{
    var hcolor = '#ff0000';
  }
    
  return (
    <div className='popup-overlay'>
      <div className='popup'>
        <p className='popup-alert' style={{backgroundColor: hcolor}}>Monitoramento</p>
        <p>Me notificar quando alguém passar a linha</p>
        
        <div>
            <label htmlFor='fromHour'>das:</label>
            <input
                type="time"
                id="fromHour"
                value={hour.start}
                onChange={(e) => handleSetHour(e, 'start')}
                style={{margin:'10px'}}
            ></input>
        </div>
        <div>
            <label htmlFor='toHour'>às</label>
            <input
                type="time"
                id="toHour"
                value={hour.end}
                onChange={(e) => handleSetHour(e, 'end')}
                style={{margin:'10px'}}
            />
        </div>
            <button className='popup button' onClick={confirm}>Confirmar</button>  
            <button className='popup button' onClick={close}>Cancelar</button>  
        
      </div>       
    </div>
  );
};

export default NotifyPopUp;