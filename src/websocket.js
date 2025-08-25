

// Conectar ao servidor WebSocket
class WebSocketClient{
    constructor(url){
        this.url = url;
        this.retries = 0;
        this.maxRetries = 1000;
        this.delayRetry = 3000;
        this.onMessageCallback = null;
    }
    connect(onMessageCallback){
        this.onMessageCallback = onMessageCallback;
        this.ws = new WebSocket(this.url);
        this.ws.onopen = () => {
            console.log('WebSocket conectado');  
        }
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const date = new Date(data.datetime);
                console.log(date);
                console.log('Notificação recebida:', data.ponto);
                //toast.info(`Pessoa detectada no ponto ${data.ponto}\n às ${date.toLocaleTimeString()}`);
                if(this.onMessageCallback){
                    onMessageCallback(data);
                }
                
            } catch (error) {
                console.error('Erro ao processar JSON:', error);
        }};
        // Evento quando desconecta
        this.ws.onclose = () => {
            console.log('WebSocket desconectado');
            if(this.retries <= this.maxRetries){
                console.log(`Tentando reconectar ${this.retries}/${this.maxRetries}`);
                this.retries ++;
                setTimeout(() => this.connect(this.onMessageCallback), this.delayRetry);
            }
            else{
                console.log("Limite de tentativas de reconexao websocket alcançado")
            }
        };

        // Evento de erro
        this.ws.onerror = (error) => {
            console.error('Erro WebSocket:', error);
            this.ws.close();
};

    }
    close(){
        this.ws.close()
    }
}

/*function sendMessage(data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}*/

export default WebSocketClient;