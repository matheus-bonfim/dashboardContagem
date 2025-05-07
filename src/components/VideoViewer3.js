function VideoViewer3(){
    const width = 1080;
    const height = Math.abs(720 / 1.5);
    return (
        <div>
            <div style={{
                width: '100%',
                maxWidth: '720px',
                aspectRatio: '16 / 9',  // Define proporção fixa
                overflow: 'hidden',
                padding: '30px'
            }}>
                <iframe
                    src="http://localhost:8889/ch1/"
                    width="100%"
                    height="100%"
                    allow="fullscreen"
                    style={{ 
                        border: 0,
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}
                />
            </div>
        </div>

      );
    
}


export default VideoViewer3;


