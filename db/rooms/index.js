const db = require( '../connection' )

const ALL_ACTIVE = `SELECT rooms.*, users.display_name AS master_user_display_name FROM rooms,users WHERE rooms.id > 0 AND rooms.ended IS NULL AND rooms.master_user_id = users.id ORDER BY rooms.started DESC, rooms.created`
const FIND_BY_ID = `SELECT * FROM rooms WHERE id = $1`
const CHECK_IF_IN_GAME = `SELECT * FROM room_users WHERE room_id=$1 and user_id=$2`
const UPDATE_USER_ID_ORDER = `UPDATE rooms SET user_id_order = $2 WHERE id=$1`
const UPDATE_MASTER_USER_ID = `UPDATE rooms SET master_user_id = $2 WHERE id=$1`
const INSERT_USER = `INSERT INTO room_users (room_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`
const REMOVE_USER = `DELETE FROM room_users WHERE room_id = $1 and user_id = $2`
const CREATE_ROOM = `INSERT INTO rooms (master_user_id, name, max_players, created, user_id_order)
                      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4) returning id`
const CLOSE_ROOM = `UPDATE rooms SET started=CURRENT_TIMESTAMP, ended=CURRENT_TIMESTAMP WHERE id=$1`
const SET_NO_WILDCARS = `UPDATE round_rolls SET has_wildcards = false WHERE room_id = $1 AND round = $2`
const GET_LAST_MOVE = `SELECT moves.*,users.display_name, (SELECT has_wildcards FROM round_rolls WHERE room_id=$1 ORDER BY round DESC LIMIT 1) AS has_wildcards FROM moves,users WHERE room_id = $1 AND moves.user_id = users.id ORDER BY time DESC LIMIT 1`
const GET_ROUND_ROLL = `SELECT * FROM round_rolls WHERE room_id = $1 ORDER BY round DESC LIMIT 1`
const GET_LAST_ENDED_ROUND = `SELECT round FROM moves WHERE room_id = $1 AND roll = 0 ORDER BY round DESC LIMIT 1`
const GET_PLAYER_LOST_DICE_AMOUNT = `SELECT COUNT (*) AS losses FROM moves WHERE room_id = $1 AND user_id = $2 AND roll = 9`
const ADD_USER_ROLL = `INSERT INTO user_rolls VALUES ($1, $2, $3, $4) ON CONFLICT (room_id, user_id, round) DO UPDATE SET dice = $4`
const ADD_ROUND_ROLL = `INSERT INTO round_rolls VALUES ($1, $2, true, $3) ON CONFLICT (room_id, round) DO UPDATE SET dice = $3`
const INSERT_MOVE = `INSERT INTO moves (room_id, user_id, round, roll, amount, time) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`
const INSERT_MESSAGE = `INSERT INTO chat_messages VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`
const IN_GAME_STATUS = `SELECT room_users.*, rooms.user_id_order, rooms.started, rooms.name, rooms.master_user_id, users.display_name, 5-(SELECT COUNT (*) FROM moves WHERE room_id=$1 AND roll=9 AND moves.user_id = room_users.user_id) AS dice_amount, (SELECT has_wildcards FROM round_rolls WHERE room_id=$1 ORDER BY round DESC LIMIT 1) AS has_wildcards FROM room_users INNER JOIN users ON room_users.user_id = users.id INNER JOIN rooms ON rooms.id = room_users.room_id WHERE room_users.room_id=$1 ORDER BY room_users.ctid` 
const GET_PAST_CHAT = `SELECT chat_messages.*, users.display_name FROM chat_messages,users WHERE room_id=$1 AND chat_messages.user_id = users.id ORDER BY time DESC LIMIT 10`
const GET_USER_ROLL = `SELECT * FROM user_rolls WHERE room_id = $1 AND user_id = $2 ORDER BY round DESC LIMIT 1`
const START_ROOM = `UPDATE rooms SET started=CURRENT_TIMESTAMP WHERE id=$1`
const END_ROOM = `UPDATE rooms SET ended=CURRENT_TIMESTAMP WHERE id=$1`
const ALL_ROUND_ROLLS = `SELECT user_rolls.*, users.display_name FROM user_rolls,users WHERE user_rolls.user_id=users.id AND room_id=$1 AND round=$2 ORDER BY user_rolls.ctid`

module.exports = {
  allActive: () => db.any( ALL_ACTIVE ),
  findById: id => db.oneOrNone( FIND_BY_ID, id ),
  checkIfInGame: (id, user_id) => db.oneOrNone( AUTH, [id, user_id] ),
  updateUserIdOrder: (id, user_id_order) => db.none( UPDATE_USER_ID_ORDER, [id, user_id_order] ),
  updateMasterUserId: (id, master_user_id) => db.none( UPDATE_MASTER_USER_ID, [id, master_user_id] ),
  insertUser: (id, user_id) => db.none( INSERT_USER, [id, user_id] ),
  removeUser: (id, user_id) => db.none( REMOVE_USER, [id, user_id] ),
  createRoom: (master_user_id, name, max_players, user_id_order) => db.one( CREATE_ROOM, [master_user_id, name, max_players, user_id_order] ),
  closeRoom: id => db.none(CLOSE_ROOM, id),
  setNoWildcards: (id, round) => db.none(SET_NO_WILDCARS, [id, round]),
  getLastMove: id => db.one(GET_LAST_MOVE, id),
  getRoundRoll: id => db.one(GET_ROUND_ROLL, id),
  getLastEndedRound: id => db.one(GET_LAST_ENDED_ROUND, id),
  getPlayerLostDiceAmount: (id, user_id) => db.one(GET_PLAYER_LOST_DICE_AMOUNT, [id, user_id]),
  addUserRoll: (id, user_id, round, dices) => db.none(ADD_USER_ROLL, [id, user_id, round, dices]),
  addRoundRoll: (id, round, dices) => db.none(ADD_ROUND_ROLL, [id, round, dices]),
  insertMove: (id, user_id, round, roll, amount) => db.none(INSERT_MOVE, [id, user_id, round, roll, amount]),
  insertMessage: (id, user_id, message) => db.none(INSERT_MESSAGE, [id, user_id, message]),
  inGameStatus: id => db.any( IN_GAME_STATUS, id ),
  getPastChat: id => db.any( GET_PAST_CHAT, id ),
  getUserRoll: (id, user_id) => db.one(GET_USER_ROLL, [id, user_id]),
  startRoom: id => db.none(START_ROOM, id),
  endRoom: id => db.none(END_ROOM, id),
  allRoundRolls: (id, round) => db.any(ALL_ROUND_ROLLS, [id, round]),


}
