const socketIo = require( 'socket.io' )

const { User, Room } = require( '../../db' )
const broadcast = require( '../../src/broadcast' )
const cookie = require('cookie')
const bcrypt = require('bcrypt')

const init = ( app, server ) => {
  const io = socketIo( server )

  app.set( 'io', io )

  io.on( 'connection', socket => {
    console.log( 'client connected' )
    socket.cookies = cookie.parse(socket.handshake.headers.cookie
         || socket.request.headers.cookie)

    socket.on( 'disconnect', data => {
      console.log( 'client disconnected' )
    })

   socket.on('room-subscribe', room_id => {
        socket.join(room_id)
        if (room_id > 0) {
            Room.inGameStatus(room_id)
            .then( result => {
                socket.emit('room-update', result)
            })
        }
    })

    socket.on('data', room_id => {
        Room.inGameStatus('3')
        .then( result => {
            console.log(result)
            socket.emit('room-update', result)
        })
    })
 
    socket.on( 'chat', ({room_id, message}) => {
        const cookies = socket.cookies
        Room.insertMessage(0, cookies.user_id, message)
        .then( _ => io.to(room_id).emit('chat', {user_id: cookies.user_id, display_name: cookies.display_name, message: message}))
    })


    socket.on( 'create-room', ({room_name}) => {
        const cookies = socket.cookies
        Room.createRoom(cookies.user_id, room_name, 5, [parseInt(cookies.user_id)])
        .then( result => {
            Room.insertUser(result.id, cookies.user_id)
            .then( _ => socket.emit('redirect', {destination: '/room/' + result.id}))
        })
    })


    socket.on( 'login', data => {
        User.findByUsername(data.username)
        .then ( result => {
            if (!result || data.username.length == 0) {
                socket.emit( 'error-message', {message: 'Wrong login/password combination'})
            } else {
               bcrypt.compare(data.password, result.password)
                .then( check => {
                    if (!check) {
                        socket.emit( 'error-message', {message: 'Wrong Login, did you want to register instead?'})
                    } else {
                        const red = 'login/'+data.username+'/'+data.password
                        socket.emit('redirect', {destination: red})
                    }
                })
            }
        })
    })

  socket.on( 'signup', data => {
        const cookies = socket.cookies
        User.checkIfRegistered(cookies.user_id, data.username)
        .then ( result => {
            if (result.length > 0) {
                socket.emit( 'error-message', {message: 'Username already registered'})
            } else {
               const hash = bcrypt.hash(data.password, 10)
                .then( hash => {
                    User.register(hash, data.username, cookies.user_id)
                    .then ( _ => socket.emit( 'redirect', {destination: '/'}) )
                })
            }
        })
    })

    socket.on( 'display-name-update', ({display_name}) => {
        const cookies = socket.cookies
        User.updateDisplayName(display_name, cookies.user_id)
        .then( result => {
            if (result.length == 0) {
                socket.emit( 'error-message', {message: 'An error has occurred'})
            } else {
                socket.cookies.display_name = result.display_name

                /*if (socket.handshake.headers.cookie) {
                    socket.handshake.headers.cookie = result.display_name
                }
                if (socket.request.headers.cookie) {
                    socket.request.headers.cookie = result.display_name
                }*/
                socket.emit ( 'update-name', {display_name: result.display_name, id: result.id})
            }
        })
        //socket.emit( 'success', {message: 'success message'})
    })

/*     socket.on( 'data', data => {
        console.log(data)
        //socket.emit( 'success', {message: 'success message'})
        Room.allActive().
        then ( result => {
            io.to('0').emit('lobby-update', result)
            console.log(result)
        })
    })*/
  })
}

module.exports = { init }
