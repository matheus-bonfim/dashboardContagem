import '../../styles/PopUp.css';

export const ConfirmPopUp = ({info, onClose, color, Confirm, goBack=false}) => {
  
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
    <div className='popup-overlay' onClick={close}>
      <div className='popup'>
        <p className='popup-alert' style={{backgroundColor: hcolor}}>Atenção</p>
        <p>{info}</p>
        <button className='popup button' onClick={close}>Cancelar</button> 
        <button className='popup button' onClick={confirm}>Sim</button> 
      </div>       
    </div>
  );
};

export default ConfirmPopUp;