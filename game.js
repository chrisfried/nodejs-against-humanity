var _ = require('underscore');
var cards = require('./cards.js');

var gameList = [];

var availableHangouts = [
  "gzpor3x5gz2tvmlvnaj35fpey4a",
  "gx3ltko3n7d5fzz3ikizlbdsfaa",
  "g6h6jp34zvjva4nmbxkpaxkjt4a",
  "g6qrsp42trimuvzlmlaxxpzioua",
  "gv7qc3ybaz6zgwoof3ewpiwya4a",
  "gx7tyjixzeswnmjyb5zbzrd7xma",
  "gxfiqdhit2asfbzgpq2amnrbiaa",
  "gsyltbe2755drym4uapwgyi6gaa",
  "grdkkehlg6flhb2z2jqj5moszya",
  "g7uscu37ldkip6mrjjxmvxcj44a",
];

function getDeck() {
  return cards.getDeck();
}

function removeFromArray(array, item) {
  var index = array.indexOf(item);
  if(index !== -1) {
    array.splice(index, 1);
  }
}

function list() {
  return toInfo(_.filter(gameList, function(x) {
    return !x.isStarted || x.isStarted
  }));
}

function listAll() {
  return toInfo(gameList);
}

function toInfo(fullGameList) {
  return _.map(fullGameList, function(game) {
    return { id: game.id, name: game.name, players: game.players.length };
  });
}

function addGame(game) {
  game.players = [];
  game.uniqueNames = [];
  game.history = [];
  game.isOver = false;
  game.winnerId = null;
  game.winningCardId = null;
  game.isStarted = false;
  game.deck = getDeck();
  game.currentBlackCard = "";
  game.isReadyForScoring = false;
  game.isReadyForReview = false;
  game.pointsToWin = 10;
  game.hangout = availableHangouts.splice(0,1)[0];
  gameList.push(game);
  return game;
}

function getGame(gameId) {
    return _.find(gameList, function(x) { return x.id === gameId; }) || undefined;
}

function joinGame(game, player) {
    var joiningPlayer = {
    id: player.id,
    name: player.name,
    isReady: false,
    cards : [],
    selectedWhiteCardId: null,
    awesomePoints: 0,
    isCzar: false
    };

    // Add Player names to White deck. For funsies.
    if (game.uniqueNames.indexOf(player.name) < 0 && player.name.indexOf("anonymous") < 0) {
      game.uniqueNames.push(player.name);
      game.deck.white.push(player.name);
    }

    for(var i = 0; i < 7; i++) {
        drawWhiteCard(game, joiningPlayer);
    }

    game.players.push(joiningPlayer);

    if(game.players.length === 3) {
      if(!game.isStarted){
        startGame(game);
      }
    }

    if (game.isStarted) {
      //someone may have dropped and rejoined. If it was the Czar, we need to re-elect the re-joining player
      var currentCzar = _.find(game.players, function(p) {
        return p.isCzar == true;
      });
      if(!currentCzar){
        game.players[game.players.length - 1].isCzar = true;
      }
    }

    return game;
}

function departGame(gameId, playerId) {
    var game = getGame(gameId);
    if(game){
        console.info('depart game: ' + game.name);
        var departingPlayer = _.find(game.players, function(p){
            return p.id === playerId;
        });
        _.each(departingPlayer.cards,function(card) {
          game.deck.white.push(card);
        });
        removeFromArray(game.players, departingPlayer);
        if(game.players.length === 0){
            //kill the game
            if (game.hangout) {
              availableHangouts.push(game.hangout);
            }
            removeFromArray(gameList, game);
        }
    }
}

function startGame(game) {
  game.isStarted = true;
  setCurrentBlackCard(game);
  game.players[0].isCzar = true;
}

function roundEnded(game) {
  game.winnerId = null;
  game.winningCardId = null;
  game.isReadyForScoring = false;
  game.isReadyForReview = false;

  setCurrentBlackCard(game);

  var czarFound = false;

  _.each(game.players, function(player) {
    if(!player.isCzar) {
      removeFromArray(player.cards, player.selectedWhiteCardId);
      drawWhiteCard(game, player);
      if (czarFound) {
        player.isCzar = true;
        czarFound = false;
      }
    } else {
      player.isCzar = false;
      czarFound = true;
    }

    player.isReady = false;
    player.selectedWhiteCardId = null;
  });

  var currentCzar = _.find(game.players, function(p) {
    return p.isCzar == true;
  });
  if(!currentCzar){
    game.players[0].isCzar = true;
  }

  if(game.isOver){
    _.map(game.players, function(p) {
        p.awesomePoints = 0;
    });
    game.isOver = false;
  }
}

function drawWhiteCard(game, player) {
  var whiteIndex = Math.floor(Math.random() * game.deck.white.length);
  player.cards.push(game.deck.white.splice(whiteIndex, 1)[0]);
}

function setCurrentBlackCard(game) {
  var index = Math.floor(Math.random() * game.deck.black.length);
  game.currentBlackCard = game.deck.black[index];
  game.deck.black.splice(index, 1);
}

function getPlayer(gameId, playerId) {
  var game = getGame(gameId);
  return _.find(game.players, function(x) { return x.id === playerId; });
}

function getPlayerByCardId(gameId, cardId) {
  var game = getGame(gameId);
  return _.findWhere(game.players, { selectedWhiteCardId: cardId });
}

function readyForNextRound(gameId, playerId) {
  var player = getPlayer(gameId, playerId);
  player.isReady = true;

  var game = getGame(gameId);
  var allReady = _.every(game.players, function(x) {
    return x.isReady;
  });

  if(allReady) {
    roundEnded(game);
  }
}

function selectCard(gameId, playerId, whiteCardId) {
  var player = getPlayer(gameId, playerId);
  player.selectedWhiteCardId = whiteCardId;
  player.isReady = false;

  var game = getGame(gameId);

  var readyPlayers = _.filter(game.players, function (x) {
    return x.selectedWhiteCardId;
  });

  if(readyPlayers.length === game.players.length - 1) {
    game.isReadyForScoring = true;
  }
}

function selectWinner(gameId, cardId) {
  var player = getPlayerByCardId(gameId, cardId);
  var game = getGame(gameId);
  game.winningCardId = cardId;
  game.isReadyForReview = true;
  player.awesomePoints = player.awesomePoints + 1;
  game.history.unshift({ black: game.currentBlackCard, white: cardId, winner: player.name });
  if(player.awesomePoints === game.pointsToWin) {
    game = getGame(gameId);
    game.isOver = true;
    game.winnerId = player.id;
  }

  roundEnded(game);
}

function reset(){
  gameList = [];
}

exports.list = list;
exports.listAll = listAll;
exports.addGame = addGame;
exports.getGame = getGame;
exports.getPlayer = getPlayer;
exports.joinGame = joinGame;
exports.departGame = departGame;
exports.readyForNextRound = readyForNextRound;
exports.reset = reset;
exports.roundEnded = roundEnded;
exports.selectCard = selectCard;
exports.selectWinner = selectWinner;
exports.removeFromArray = removeFromArray;
exports.getDeck = getDeck;
