import axios from 'axios';

const ApiContagem = axios.create({
    baseURL: 'http://172.16.0.150:3500/api'
});

const ApiDB = axios.create({
    baseURL: 'http://172.16.0.150:5000/api'
});


const get = async (api, path, params=null) => {
    
    try{
        if(params) {
            var response = await api.get(path, params);
        }
        else{
            var response = await api.get(path);
        }
        
        return response.data;
        
    }
    catch(error){
        console.error(error);
        return null;
    }
}


export const get_table_info = async () => {
    return await get(ApiContagem, '/info');
}

export const get_info_cam = async (ponto) => {
    return await get(ApiContagem, '/infocam', {params: {ponto: ponto}});
}

export const reset_counter = async (ponto) => { 
    return await get(ApiContagem, '/reset', {params: {ponto: ponto}});
}

export const watch_stream = async (cam) => {
    return await get(ApiContagem, '/watch', {params: {cam: cam}});
}

export const add_cam = async (ponto) => {
    return await get(ApiContagem, '/insertcamContagem', {params: {ponto: ponto}});
}

export const remove_cam = async (ponto) => {
    return await get(ApiContagem, '/deletecamContagem', {params: {ponto: ponto}});
}

export const start_contagem = async (ponto, p1, p2) => {
    return await get(ApiContagem, '/startContagem', {params: {ponto: ponto, p1: p1, p2: p2}});
}

export const stop_contagem = async (ponto) => {
    return await get(ApiContagem, '/stopContagem', {params: {ponto: ponto}});
}

// DB

export const get_cam_ip = async (ponto) => {
    return await get(ApiDB, '/ipcam', {params: {ponto: ponto}})
}

