import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import WebSocketClient  from './websocket.js';

const channel = new BroadcastChannel('notification_channel');

export default function WebSocketListener() {
    const shownNotificationIds = useRef(new Set())

    useEffect(() => {
        const handleChannelMessage = (event) => {
            const messageId = event.data?.id;
            if (messageId){
                console.log(`Notificação [${messageId}] tratada por outra aba. Adicionando à lista de "vistos".`);
                shownNotificationIds.current.add(messageId);
            }
        }
        channel.addEventListener('message', handleChannelMessage);

        const handleNewNotification = (data) => {
            const messageId = data.id;
            

            if(!messageId){
                console.warn("Notificação recebida sem ID. Exibindo de qualquer maneira.", data);
                toast.info(data.ponto || "Nova notificação");
                return;
            }
            if(shownNotificationIds.current.has(messageId)){
                console.log(`Notificação [${messageId}] já foi exibida. Ignorando.`);
                return;
            }
            shownNotificationIds.current.add(messageId);
            toast.info(data.ponto);

            console.log(`Exibindo notificação [${messageId}] e avisando outras abas.`);
            channel.postMessage({ id: messageId });
        }



        const ws = new WebSocketClient('ws://localhost:7070');

        //ws.connect(toast);
        ws.connect(handleNewNotification);

    return () => {
        ws.close();
        channel.removeEventListener('message', handleChannelMessage);
    
    }
  }, []);

  return null;
}


