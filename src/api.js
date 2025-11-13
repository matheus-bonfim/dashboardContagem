import axios from 'axios';

const ApiContagem = axios.create({
    baseURL: 'http://189.4.2.61:3500/api'
});

// const ApiDB = axios.create({
//     baseURL: 'http://localhost:5000/api'
// });

const ApiBackendLPR = axios.create({
    baseURL: 'http://189.4.2.61:5000/api'
})

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
    return await get(ApiContagem, '/restartMachine', {params: {ponto: ponto, zerar: true}});
}

export const restart_machine = async (ponto) => { 
    return await get(ApiContagem, '/restartMachine', {params: {ponto: ponto, zerar: false}});
}


export const watch_stream = async (ip, ponto, tipo, fabricante) => {
    return await get(ApiBackendLPR, '/getRTSP_Stream', {params: {ip, ponto, tipo, fabricante}});
}

export const add_cam = async (ponto) => {
    return await get(ApiContagem, '/insertcamContagem', {params: {ponto: ponto}});
}

export const remove_cam = async (ponto) => {
    const res = await get(ApiContagem, '/deletecamContagem', {params: {ponto: ponto}});
    await remove_stream(ponto);
    return res; 
}

export const remove_stream = async (ponto) => {
    return await get(ApiBackendLPR, '/removeStream', {params: {ponto: ponto}});
}

export const start_contagem = async (ponto, p1, p2, direction, fromHour, toHour, ip, tipo) => {
    console.log(fromHour, toHour);
    return await get(ApiContagem, '/startContagem', {params: {ponto: ponto, p1: p1, p2: p2, direction: direction, fromHour: fromHour, toHour: toHour, ip: ip, tipo: tipo}});
}

export const stop_contagem = async (ponto) => {
    return await get(ApiContagem, '/stopContagem', {params: {ponto: ponto}});
}

// DB

// export const get_cam_ip = async (ponto) => {
//     return await get(ApiDB, '/ipcam', {params: {ponto: ponto}})
// }

