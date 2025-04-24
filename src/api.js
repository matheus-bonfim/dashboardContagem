import axios from 'axios';

const ApiClient = axios.create({
    baseURL: 'http://172.16.0.150:3500/api'
});

export const get_table_info = async () => {
    
    try{
        const response = await ApiClient.get(`/info`);
        
        return response.data;
        
    }
    catch(error){
        console.error(error);
        throw error;
    }
}


export const reset_counter = async (ponto) => {
    
    try{
        const response = await ApiClient.get(`/reset`, {params: {ponto: ponto}});
        console.log(response.data);
        return response.data;
        
    }
    catch(error){
        console.error(error);
        throw error;
    }
}


