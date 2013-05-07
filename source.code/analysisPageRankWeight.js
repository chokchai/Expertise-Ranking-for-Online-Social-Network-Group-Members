var mysql = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'thesis',
	multipleStatements: true
});

// like with others
calcWeight(function(weightArray){

	analyse(weightArray, 'WEIGHT_LIKE_AND_OTHERS');

	// like socre
	calLikeScore(function(weightArray){

		var weightArray = normalize(weightArray);

		analyse(weightArray, 'WEIGHT_LIKE');

		process.exit();
	});

});

function analyse(weightArray, title){

	title = title ? title : 'ANALYSE_RESULTS';

	var sum = 0;
	var wCounter = [0,0,0,0,0];

	for(id in weightArray){

		var w = weightArray[id];

		if(w >= 0.8){
			wCounter[0]++;
		} else if(w >= 0.6){
			wCounter[1]++;
		} else if(w >= 0.4){
			wCounter[2]++;
		} else if(w >= 0.2){
			wCounter[3]++;
		} else {
			wCounter[4]++;
		}

		sum += w;
	}

	var mean = sum/length(weightArray);

	var tSum = 0;
	for(id in weightArray){

		var w = weightArray[id];

		tSum += Math.pow((w-mean), 2);
	}

	var sd = Math.sqrt( tSum/length(weightArray) );

	log('\n'+title+':');
	log('1 > w >= 0.8 : '+wCounter[0]);
	log('0.8 > w >= 0.6 : '+wCounter[1]);
	log('0.6 > w >= 0.4  : '+wCounter[2]);
	log('0.4 > w >= 0.2 : '+wCounter[3]);
	log('0.2 > w >= 0 : '+wCounter[4]);
	log('SUM:');
	log(sum);
	log('MEAN:');
	log(mean);
	log('SD:');
	log(sd);
}

//-------------------------------------------------------------
// FUNCTIONS
//-------------------------------------------------------------

// only count score each post
function calLikeScore(callback){

	var score = [];
	var eachPostCounter = 0;

	// select all post
	query('SELECT * FROM java_post', function(posts){
		
		for(var i = 0; i < posts.length; i++){
			
			var post = posts[i];

			query("SELECT * FROM java_comments WHERE post_id = '"+post.id+"'", function(comments){

				if(comments.length > 0){

					var memberLikesCount = [];
					var likesCount = 0;
					for(var j = 0; j < comments.length; j++){

						var c = comments[j];

						// count all
						likesCount += parseInt(c.likes_count);

						// count each member like
						memberLikesCount = setArrayCount(memberLikesCount, 'ID_'+c.member_id, c.likes_count);
					}

					//log('LIKES_COUNT');
					//log(likesCount+'\n');

					//log('MEMBER_LIKES_COUNT');
					//log(memberLikesCount);
					//log('\n');

					// have like
					for(id in memberLikesCount){

						// calc score per member
						var memberScore = (memberLikesCount[id] + 1) / (likesCount + length(memberLikesCount));

						// keep score
						score = setArrayCount(score, id, memberScore);
					}
				}
			})
			.on('end', function(){

				if(++eachPostCounter === posts.length){
					callback(score);
				}
			});
		}

		
	});
}

function setArrayCount(arr, id, count){

	if(arr[id] === undefined){
		arr[id] = count;
	} else {
		arr[id] += count;
	}

	return arr;
}

function calcLikesScore(comments, scoreLikes){

	var memberLikesCount = [];
	var likesCount = 0;
	for(var j = 0; j < comments.length; j++){

		var c = comments[j];

		// count all
		likesCount += parseInt(c.likes_count);

		// count each member like
		memberLikesCount = setArrayCount(memberLikesCount, 'ID_'+c.member_id, c.likes_count);

	}

	//log('LIKES_COUNT');
	//log(likesCount+'\n');

	//log('MEMBER_LIKES_COUNT');
	//log(memberLikesCount);
	//log('\n');

	// have like
	for(id in memberLikesCount){

		// shave to sum == 1
		var likeScore = (memberLikesCount[id] + 1) / (likesCount + length(memberLikesCount));
		scoreLikes = setArrayCount(scoreLikes, id, likeScore);
	}

	return scoreLikes;
}

function calcLengthScore(comments, scoreLength){

	var lengthCount = 0;
	var memberCommentLength = [];

	for(var j = 0; j < comments.length; j++){

		var c = comments[j];

		lengthCount += c.message.length;

		memberCommentLength = setArrayCount(memberCommentLength, 'ID_'+c.member_id, c.message.length);
	}

	for(id in memberCommentLength){

		var lengthScore = memberCommentLength[id]/lengthCount;
		scoreLength = setArrayCount(scoreLength, id, lengthScore);
	}

	return scoreLength;
}

function calcEntropyScore(comments, scoreEntropy){

	var commentEntropyCount = 0;
	var commentEntropy = [];

	for(var j = 0; j < comments.length; j++){

		var c = comments[j];

		// get each word
		var tworkds = c.message.split(' ');
		var cwords = [];
		// remove ' ' (space)
		for(var k=0; k<tworkds.length; k++){
			if(tworkds[k] !== ''){
				cwords.push(tworkds[k]);
			}
		}

		// count each word
		var wordsCount = [];
		for(var k=0; k<cwords.length; k++){

			wordsCount = setArrayCount(wordsCount, cwords[k], 1);
		}

		// log('WORD COUNT');
		// log(wordsCount);

		var sumPi = 0;
		for(word in wordsCount){

			// frequency = word_appear/word_count
			var pi = wordsCount[word]/cwords.length;

			//  frequency[log10(number_of_unique_word) - log10(frequency)]
			sumPi += pi*( log10(length(wordsCount)) - log10(pi) );
		}

		// calc entropy
		var entropyValue = sumPi/length(wordsCount);
		commentEntropy[c.id] = { member_id: c.member_id, entropy: entropyValue };
		commentEntropyCount += entropyValue;
	}

	// log('COMMENT ENTROPY');
	// log(commentEntropy);

	// calc member entropy
	for(cid in commentEntropy){

		var comment = commentEntropy[cid];

		var entropy = comment.entropy/commentEntropyCount;
		scoreEntropy = setArrayCount(scoreEntropy, 'ID_'+comment.member_id, entropy);
	}

	return scoreEntropy;
}

function calcTFIDFScore(comments, scoreTFIDF){

	var commentsTermOccur = [];
	var commentsTFIDF = [];
	var tfidfCount = 0;

	for(var j = 0; j < comments.length; j++){

		var c = comments[j];

		// get each word
		var tworkds = c.message.split(' ');
		var terms = [];
		// remove ' ' (space)
		for(var k=0; k<tworkds.length; k++){
			if(tworkds[k] !== ''){
				terms.push(tworkds[k]);
			}
		}

		// occur term
		var termsOccur = [];
		for(var k=0; k<terms.length; k++){

			termsOccur = setArrayCount(termsOccur, terms[k], 1);
		}

		commentsTermOccur[j] = {member_id: c.member_id, termsOccur:termsOccur};
	}

	// log('TERMS_OCCOR');
	// log(commentsTermOccur);

	for(var j=0; j<commentsTermOccur.length; j++){

		var cTermOccur = commentsTermOccur[j];
		var termOccur = cTermOccur.termsOccur;
		var memberId = cTermOccur.member_id;

		var tfidf = 0;
		for(term in termOccur){

			tfidf += tf(term, termOccur)*idf(term, commentsTermOccur); 

			//log('TF '+tf(term, termOccur)+' IDF '+idf(term, commentsTermOccur));
		}

		commentsTFIDF[j] = {member_id: memberId, tfidf: tfidf};
		tfidfCount += tfidf;
	}

	// log('TFIDF');
	// log(commentsTFIDF);

	for(var j=0; j<commentsTFIDF.length; j++){

		var memberId = commentsTFIDF[j].member_id;
		
		var tfidf = 1/commentsTFIDF.length;

		if(tfidfCount !== 0){
			var tfidf = commentsTFIDF[j].tfidf/tfidfCount;
		}

		scoreTFIDF = setArrayCount(scoreTFIDF, 'ID_'+memberId, tfidf);
	}

	return scoreTFIDF;
}

function tf(i, termsOccur){

	var sumFrequency = 0;
	for(term in termsOccur){
		sumFrequency += termsOccur[term];
	}

	return termsOccur[i]/sumFrequency;
}

function idf(i, commentsTermOccur){

	var termOccurCount = 0;
	for(index in commentsTermOccur){

		if(commentsTermOccur[index].termsOccur[i] !== undefined){
			termOccurCount++;
		}
	}

	return log10(length(commentsTermOccur)/(termOccurCount+1));
}

// only count score each post
function calcWeight(callback){

	var score = [];
	var scoreLikes = [];
	var scoreLength = [];
	var scoreEntropy = [];
	var scoreTFIDF = [];
	var eachPostCounter = 0;

	// select all post
	query('SELECT * FROM java_post', function(posts){
		
		for(var i = 0; i < posts.length; i++){
			
			var post = posts[i];
			var score = [];

			query("SELECT * FROM java_comments WHERE post_id = '"+post.id+"'", function(comments){
				
				if(comments.length > 0){

					// log('COMMENTS');
					// log(comments);

					// score
					scoreLikes = calcLikesScore(comments, scoreLikes);
					scoreLength = calcLengthScore(comments, scoreLength);
					scoreEntropy = calcEntropyScore(comments, scoreEntropy);
					scoreTFIDF = calcTFIDFScore(comments, scoreTFIDF);

					// log('\n');
					// log('SCORE_LIKES');
					// log(scoreLikes);
					// log('SCORE_LENGTH');
					// log(scoreLength);
					// log('SCORE_ENTROPY');
					// log(scoreEntropy);
					// log('SCORE_TFIDF');
					// log(scoreTFIDF);

					// keep score sum
					for(id in scoreLikes){

						var s = (scoreLikes[id]+scoreLength[id]+scoreEntropy[id]+scoreTFIDF[id])/4;
						score = setArrayCount(score, id, s);
					}

				}
			})
			.on('end', function(){

				if(++eachPostCounter === posts.length){

					// log('SCORE');
					// log(score);

					score = normalize(score);

					// log('N_SCORE');
					// log(score);
					// log('\n');

					callback(score);
				}
			});
		}

	});
}

function normalize(arr){

	var nArr = [];

	// find max and min
	var sMax = -1;
	var sMin = 999999999;

	for(id in arr){

		var mScore = arr[id];

		// is new max
		if(mScore > sMax){

			sMax = mScore;
		}

		// is new min
		if(mScore < sMin){

			sMin = mScore;
		}
	}

	for(id in arr){

		var mScore = arr[id];
		
		if( (mScore - sMin) > 0) {

			// normalize
			nArr[id] = (mScore - sMin)/(sMax - sMin);
		} else {

			nArr[id] = 0;
		}
	}

	return nArr;
}

function query(sql, data, callback){

	// ovrloading
	if(typeof data === 'function'){

		callback = data;
		data = {};
	}

	if(data === undefined && callback === undefined){
		
		return connection.query(sql).on('error', function(err){

			console.log(sql);
			console.log(data);
			throw err;
		});
	}

	return connection.query(sql, data, function(err, rows){

		if(err){

			console.log(sql);
			console.log(data);
			throw err;
		}

		//console.log('QUERY: '+sql);
		//console.log(data);
		//console.log('\n');

		if(typeof callback === 'function'){

			callback(rows, err);
		}
		
	});

}

function sort_unique(arr) {
    arr = arr.sort(function (a, b) { return a*1 - b*1; });
    var ret = [arr[0]];
    for (var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can never be a duplicate
        if (arr[i-1] !== arr[i]) {
            ret.push(arr[i]);
        }
    }
    return ret;
}

function log(obj){
	console.log(obj);
}


function clone(obj){
    if(obj == null || typeof(obj) != 'object')
        return obj;

    var temp = obj.constructor(); // changed

    for(var key in obj)
        temp[key] = clone(obj[key]);
    return temp;
}

function fileterOne(arr){
	
	var array = [];
	for(id in arr){

		if(arr[id] !== 1){
			array[id] = arr[id];
		}
	}

	return array;
}

function unique(arr) {
    var hash = {}, result = [];
    for ( var i = 0, l = arr.length; i < l; ++i ) {
        if ( !hash.hasOwnProperty(arr[i]) ) { //it works with objects! in FF, at least
            hash[ arr[i] ] = true;
            result.push(arr[i]);
        }
    }
    return result;
}

function isStable(arr1, arr2){

	log('COMPARE');
	// log(fileterOne(arr1));
	// log(fileterOne(arr2));

	for(id in arr1){

		var higher = Math.max(arr1[id], arr2[id]);
		var lower = Math.min(arr1[id], arr2[id]);

		if(higher - lower > 0.0000000001){
			return false;
		}
	}

	return true;
}

function length(obj){

	return Object.keys(obj).length;
}

function log10(val) {
  return Math.log(val) / Math.LN10;
}