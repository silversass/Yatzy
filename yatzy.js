module.exports = {

	reply: function(bot, tags, user){

		var mainTag = String(tags.main);

		switch(mainTag){

			case 'join':
				return join(bot, user);
			case 'start':
				return start(bot);
			case 'roll':
				return roll(bot, tags, user);
			case 'save':
				return save(bot, tags, user);
			case 'end':
				return end(bot);
			case 'score':
				return score(bot, user);
			case 'rules':
				return rules(bot);
			default:
				return help(bot);

		}

	}
};

var data = {
	lobby: [],
	dice: [],
	game: null
};

var Player = function(name){
	this.name = name;
	this.scores = new Scores();
	this.tries = 3;
};

var Scores = function(){
	this.aces = null;
	this.twos = null;
	this.threes = null;
	this.fours = null;
	this.fives = null;
	this.sixes = null;
	this.pair = null;
	this.pairs = null;
	this.trips = null;
	this.quads = null;
	this.smallStraight = null;
	this.largeStraight = null;
	this.fullHouse = null;
	this.sum = null;
	this.yatzy = null;
};

var scoreNames = {
	ACES: 'Ühed',
	TWOS: 'Kahed',
	THREES: 'Kolmed',
	FOURS: 'Neljad',
	FIVES: 'Viied',
	SIXES: 'Kuued',
	PAIR: '1 paar',
	PAIRS: '2 paari',
	TRIPS: 'Kolmik',
	QUADS: 'Nelik',
	SMALL_STRAIGHT: 'Väike rida',
	LARGE_STRAIGHT: 'Suur rida',
	FULL_HOUSE: 'Maja',
	SUM: 'Summa',
	YATZY: 'Yatzy'
};

var error = {
	GAME_RUNNING: 'Mäng juba käib',
	GAME_NOT_RUNNING: 'Mäng ei käi',
	ALREADY_REGISTERED: 'Sa oled juba registreerunud',
	LOBBY_EMPTY: 'Lobby on tühi. Kasuta !yatzy join',
	WRONG_TURN: 'Praegu pole sinu käik',
	NO_ROLLS: 'Sa ei saa rohkem veeretada see käik',
	ROLL_FIRST: 'Veereta kõigepealt: !yatzy roll',
	WRONG_ROLL: 'Kasuta indekseid, nt 1., 2. ja 3. täring: !yatzy roll -m 1 2 3',
	NO_COMBINATION: 'Ei ole olemas sellist kombinatsiooni',
	HAVE_SCORE: 'See skoor on juba olemas',
	SCORE_NOT_FOUND: 'Skoori ei leitud'
};

function join(bot, user){

	if (gameIsRunning()){

		bot.reply(error.GAME_RUNNING, true);
		
	} else {

		if (data.lobby.indexOf(user.name) > -1){

			bot.reply(error.ALREADY_REGISTERED, true);

		} else {

			data.lobby.push(user.name);
			bot.reply(user.name + ' ühines Yatzyga', true);

		}
	}
};

function start(bot){

	if (gameIsRunning()){

		bot.reply(error.GAME_RUNNING, true);

	} else {

		if (data.lobby.length > 0){

			// Create array of player objects
			var arr = [];
			for (var i in data.lobby){
				arr.push(new Player(data.lobby[i]));
			}

			// Create game object
			data.game = {players: arr};

			bot.reply('YATZY TIME! Kui vajad abi, kasuta !yatzy');

			var i = 1;
			delayReply(bot, i, 'Mängivad:');

			for (var j in data.game.players){
				i++;
				delayReply(bot, i, data.game.players[j].name);
			}

		} else {

			bot.reply(error.LOBBY_EMPTY, true);

		}
	}
};

function roll(bot, tags, user){

	if (gameIsRunning()){

		if (user.name != data.game.players[0].name){

			bot.reply(error.WRONG_TURN, true);

		} else {

			if (data.game.players[0].tries > 0){

				var indexArr = String(tags.m).split(' ');

				// When there is no input, reset the array and roll all
				if (indexArr[0] == 'undefined'){
					indexArr = [];
				}

				for (var i = 0; i < indexArr.length; i++){

					// If any of these conditions is met, return error and dont roll
					if (isNaN(indexArr[i]) || indexArr[i] > 5 || indexArr[i] < 1){

						return bot.reply(error.WRONG_ROLL, true);

					// Convert number string to index
					} else {

						indexArr[i] = parseInt(indexArr[i] - 1);

					}
				}

				switch(true){

					case (indexArr.length > 0):
						for (index in indexArr){
							data.dice[indexArr[index]] = rollDice();
						}
						break;
					default:
						data.dice = rollAll();
						break;
				}

				data.game.players[0].tries -= 1;
				bot.reply(user.name + ' veeretas täringuid: ' + data.dice.join(' '), true);				

			} else {

				bot.reply(error.NO_ROLLS, true);

			}
		}

	} else {

		bot.reply(error.GAME_NOT_RUNNING, true);

	}
};

function save(bot, tags, user){

	if (gameIsRunning()){

		if (user.name != data.game.players[0].name){

			bot.reply(error.WRONG_TURN, true);

		} else {

			if (data.dice.length === 5){

				bot.reply(processChoice(bot, String(tags.m)), true);

			} else {

				bot.reply(error.ROLL_FIRST, true);

			}
		}

	} else {

		bot.reply(error.GAME_NOT_RUNNING, true);

	}
};

function processChoice(bot, choice){
	
	switch(choice){

		case 'ühed':
			return calculateScore(bot, 'aces', count(1) * 1);
		case 'kahed':
			return calculateScore(bot, 'twos', count(2) * 2);
		case 'kolmed':
			return calculateScore(bot, 'threes', count(3) * 3);
		case 'neljad':
			return calculateScore(bot, 'fours', count(4) * 4);
		case 'viied':
			return calculateScore(bot, 'fives', count(5) * 5);
		case 'kuued':
			return calculateScore(bot, 'sixes', count(6) * 6);
		case 'paar':
			return calculateScore(bot, 'pair', findPair());
		case 'kaks paari':
			return calculateScore(bot, 'pairs', findPairs());
		case 'kolmik':
			return calculateScore(bot, 'trips', findTrips());
		case 'nelik':
			return calculateScore(bot, 'quads', findQuads());
		case 'väike rida':
			return calculateScore(bot, 'smallStraight', findSmallStraight());
		case 'suur rida':
			return calculateScore(bot, 'largeStraight', findLargeStraight());
		case 'maja':
			return calculateScore(bot, 'fullHouse', findFullHouse());
		case 'summa':
			return calculateScore(bot, 'sum', sum());
		case 'yatzy':
			return calculateScore(bot, 'yatzy', findYatzy());
		default:
			return error.NO_COMBINATION;
	}
};

function calculateScore(bot, key, calculation){

	var scores = data.game.players[0].scores;
	
	if (noScore(scores[key])){
		
		scores[key] += calculation;

		// Reset amount of tries
		data.game.players[0].tries = 3;

		// Move current player to the end of the playerlist
		data.game.players.push(data.game.players.shift());

		// Clear the board
		data.dice = [];

		return checkIfOver(bot);

	} else {

		return error.HAVE_SCORE;

	}
};

function end(bot){

	if (gameIsRunning()){

		data.lobby = [];
		data.dice = [];
		data.game = null;

		bot.reply('Mäng on enneaegselt lõpetatud.', true);

	} else {

		bot.reply(error.GAME_NOT_RUNNING, true);

	}
};

function score(bot, user){

	// Find index of player obj with same name
	index = data.game.players.map(function(player, index){
		if (player.name === user.name){
			return index;
		}
	}).filter(isFinite);

	if (index.length > 0){

		var player = data.game.players[index];
		var keys = Object.keys(scoreNames);
		var finalScore = 0;
		var i = 0;

		for (var j in player.scores){
			
			var score = player.scores[j];
			finalScore += score;
			
			if (score === null){
				score = '';
			}

			delayReply(bot, i, scoreNames[keys[i]] + ': ' + score);
			i++;

		}

		delayReply(bot, i, 'Lõpptulemus: ' + finalScore);

	} else {

		bot.reply(error.SCORE_NOT_FOUND, true);

	}
};

function delayReply(bot, i, s){

	setTimeout(function(){
		bot.reply(s, true);
	}, i*300);
};

function help(bot){

	var replies = ['!yatzy start - alustab mängu',
				   '!yatzy join - ühineb lobbyga',
				   '!yatzy roll - veeretab kõiki vürfleid',
				   '!yatzy roll -m 1 2 3 - veeretab valitud vürfleid',
				   '!yatzy save -m <valik> - salvestab skoori, nt !yatzy save -m maja',
				   '!yatzy end - lõpetab käimasoleva mängu',
				   '!yatzy rules - kuvab mängureegleid'];

	for (var i in replies){
		delayReply(bot, i, replies[i]);
	}
};

function rules(bot){

	var replies = ['Yatzy ehk täringupokker',
				   '-----------------------',
				   'Iga käik veeretab mängija täringuid, ühe käigu jooksul saab 3 korda veeretada',
				   'Saab veeretada kas kõik täringud koos või valitud täringuid (nt 1. ja 3.),',
				   'et saada sobiv kombinatsioon',
				   'Seejärel salvestab ta skoori soovitud kombinatsioonina (nt laual 1 3 5 5 3 kaks paari)',
				   'Ühte kombinatsiooni saab mängu jooksul vaid ühe korra salvestada',
				   'Võimalikud kombinatsioonid:',
				   'ühed-kuued',
				   'paar',
				   'kaks paari',
				   'kolmik',
				   'nelik',
				   'väike rida (1-5, 15 punkti)',
				   'suur rida (2-6, 20 punkti)',
				   'maja (kaks ühesugust ning kolm teistsugust, nt 1 6 6 1 6',
				   'summa (täringute näitude summa)',
				   'yatzy (kõigil täringutel sama näit, 50 punkti)',
				   'NB! Kui ühtedest kuuteni punktisumma ületab 63, siis saad 50 boonuspunkti'];

	for (var i in replies){
		delayReply(bot, i, replies[i]);
	}
};

function checkIfOver(bot){

	var finalScores = {};

	for (var p in data.game.players){
		
		player = data.game.players[p];
		var score = 0;

		for (scoreIndex in player.scores){

			if (noScore(player.scores[scoreIndex])){
				return 'Nüüd on ' + data.game.players[0].name + ' kord';
			}

			score += player.scores[scoreIndex];

			if (scoreIndex == 'sixes' && score >= 63){
				score += 50;
			}
		}

		finalScores[player.name] = score;
	}
	bot.reply('MÄNG ON LÕPPENUD!', true);
	var i = 1;
	for (var name in finalScores){
		delayReply(bot, i, name + ': ' + finalScores[name]);
		i++;
	}

	// Reset game.
	data.lobby = [];
	data.dice = [];
	data.game = null;
};

function noScore(score){

	if (score === null){
		return true;
	}

	return false;
};

function gameIsRunning(){

	if (data.game === null){
		return false;
	}

	return true;
};

function rollDice(){

	return Math.floor(Math.random() * 6 + 1);
};

function rollAll(){

	var rolls = [];
	
	for (var i = 0; i < 5; i++){
		rolls.push(rollDice());
	}

	return rolls;
};

function count(n){

	var count = 0;
	for (var i = 0; i < data.dice.length; i++){

		if (data.dice[i] === n){
			count += 1;
		}
	}

	return count;
};

function findPair(){
	
	for (var i = 6; i > 0; i--){

		if (count(i) > 1){
			return 2 * i;
		}
	}

	return 0;
};

function findPairs(){

	var score = 0;
	var pairsFound = 0;

	for (var i = 6; i > 0; i--){

		if (count(i) >= 2){
			score += 2 * i;
			pairsFound += 1;
		}

		if (pairsFound === 2){
			return score;
		}
	}

	return 0;
};

function findTrips(){

	for (var i = 6; i > 0; i--){

		if (count(i) >= 3){
			return 3 * i;
		}

	}

	return 0;
};

function findQuads(){

	for (var i = 6; i > 0; i--){

		if (count(i) >= 4){
			return 4 * i;
		}

	}

	return 0;
};

function findSmallStraight(){

	for (var i = 5; i > 0; i--){

		if (count(i) === 0){
			return 0;
		}

	}

	return 15;
};

function findLargeStraight(){

	for (var i = 6; i > 1; i--){

		if (count(i) === 0){
			return 0;
		}

	}

	return 20;
};

function findFullHouse(){

	var wallFound = false;
	var roofFound = false;

	for (var i = 6; i > 0; i--){

		if (count(i) === 3){
			roofFound = true;
		}

		if (count(i) === 2){
			wallFound = true;
		}

		if (wallFound && roofFound){
			return sum();
		}
	}

	return 0;
};

function sum(){

	return data.dice.reduce(function(a, b){ return a + b; }, 0);	
};

function findYatzy(){

	for (var i = 6; i > 0; i--){

		if (count(i) === 5){
			return 50;
		}

	}

	return 0;
};