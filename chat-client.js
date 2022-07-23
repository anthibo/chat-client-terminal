const readline = require('readline');
const axios = require('axios').default;
const decoder = require('jwt-decode').default;
const {
    io
} = require('socket.io-client')

const serverUrl = 'http://localhost:3000'
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const sendMsg = (roomName) => {
    rl.question('> ', (message) => {
        console.log('sending a message rn...')
        socket.emit('send message', {
            roomName,
            message,
            time: Date.now().toLocaleString()
        });
        rl.prompt(true)
        sendMsg(roomName);
    });
}
const socket = io(serverUrl, {
    autoConnect: false,
    transports:["websocket"] 
})
const apiClient = axios.create({
    baseURL: serverUrl,
})
rl.question('What\'s your username and password ? ', async (input) => {
    let [loginUsername, password] = input.split(' ')
    const loginResponse = await apiClient.post('api/auth/login', {
        username: loginUsername,
        password
    }).catch((err => {
        console.log(err)
    }))
    const {
        accessToken
    } = loginResponse.data
    const bearerToken = `Bearer ${accessToken}`
    const decodedData = await decoder(accessToken)
    console.log(decodedData)
    const {
        id,
        username
    } = decodedData
    socket.auth = {
        username,
        id
    }
    socket.connect()

    socket.on('connect', () => {
        console.log('Successfully connected to server.');
    });

    socket.on('new message', ({
        from,
        message,
        time
    }) => {
        console.log(`${from}: ${message}  |${time}|`);
    });

    socket.on('new chat', ({
        from,
        message,
        time
    }) => {
        console.log(`NEW CHAT: from${from}: ${message}  at |${time}|`);
    });

    socket.on('disconnect', () => {
        console.log('Connection lost...')
    });

    const roomRes = await apiClient.get('/api/room', {
        headers: {
            Authorization: bearerToken
        }
    }).catch((err => {
        console.log(err)
    }))
    console.log('select an action')
    const rooms = roomRes.data.rooms
    rooms.forEach((room, index) => {
        console.log(`> ${index} chat with ${room.roomParticipants[0].user.username}`)
    });
    console.log(`> 000 - chat with other users`)
    rl.question('> action: ', (action) => {
        if (action === '000') {
            //create new chat-room with new user and send a message to him
            rl.question('> insert user id to chat with your message:', (input) => {
                const [to, message] = input.substring(' ')
                socket.emit('create private chat room', {
                    to,
                    message
                })
                let roomName
                socket.on('room:created', (data) => {
                    roomName = data
                    console.log(roomName)
                    sendMsg(roomName);
                })

            })

        } else {
            // join existing room
            // get chat streaming for the joined room
            const index = parseInt(action)
            const roomName = rooms[index].name
            console.log(roomName)
            socket.emit('join private chat room', roomName)
            sendMsg(roomName);
        }
    });


});