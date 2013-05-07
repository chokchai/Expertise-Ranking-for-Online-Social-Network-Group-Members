var mysql = require('mysql');
var mysql = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'thesis',
	multipleStatements: true
});

var all_member = [];
var likeWeight = [];
var likeScore = [];
var communityExpertiseNetworkIn = [];
var communityExpertiseNetworkOut = [];
var nScoreArray = [];

//-------------------------------------------------------------
// INIT APPS
//-------------------------------------------------------------

// build adj matrix
createCommunityExpertiseNetwork(function(){

	// remove duplicate all_member
	all_member = unique(all_member);

	var pageRank = initPageRank(all_member);

	// remove only inbound and outbound link
	var onlyInboundList = [];
	var onlyOutboundList = [];

	for(var id in pageRank){

		// only inbound list
		if(communityExpertiseNetworkIn[id] && ! communityExpertiseNetworkOut[id]){
			onlyInboundList.push(id);
		}

		// only outbound list
		if( ! communityExpertiseNetworkIn[id] && communityExpertiseNetworkOut[id]){
			onlyOutboundList.push(id);
		}
	}

	// log('#EXP_NETWORK_IN');
	// log(communityExpertiseNetworkIn);

	// log('#EXP_NETWORK_OUT');
	// log(communityExpertiseNetworkOut);

	// log('#INBOUND');
	// log(onlyInboundList);

	// log('#OUTBOUND');
	// log(onlyOutboundList);

	// process.exit();

	calcWeight(function(scoreArray){

		nScoreArray = normalize(scoreArray);

		var sumScore = 0;
		for(var id in nScoreArray){
			sumScore += nScoreArray[id];
		}

		for(var id in nScoreArray){
			nScoreArray[id] = (nScoreArray[id]/sumScore)*all_member.length;
		}

		// for(var id in scoreArray){

		// 	pageRank[id] += scoreArray[id];
		// }

		//log(fileterOne(pageRank));
		var newPageRank = calPageRank(pageRank);

		// remove only inbound and outbound from CEN
		var tmp_communityExpertiseNetworkIn = clone(communityExpertiseNetworkIn);
		var tmp_communityExpertiseNetworkOut = clone(communityExpertiseNetworkOut);

		// remove only inbound by stop linking to them
		for(var id in onlyInboundList){
			communityExpertiseNetworkIn[id] = undefined;
		}

		for(var id in onlyOutboundList){
			communityExpertiseNetworkOut[id] = undefined;
		}

		// re-calulate pagerank until is stable
		while(! isStable(pageRank, newPageRank)){

			pageRank = newPageRank;
			newPageRank = calPageRank(newPageRank);
		}

		// add only inbound and [not] outbound link
		communityExpertiseNetworkIn = tmp_communityExpertiseNetworkIn;
		//communityExpertiseNetworkOut = tmp_communityExpertiseNetworkOut;

		newPageRank = calPageRank(newPageRank);

		// insert to database
		var i = 0;
		for(var id in newPageRank ){
			query('INSERT INTO java_expertise_rank_with_likes_and_others_fixed6 SET ?', { member_id: id, expertise_rank: newPageRank[id] })
			.on('end', function(){  
				i++; 
				if(i>=length(newPageRank)) 
					log('lowest ER: '+(1/all_member.length));
			});
		}

	});

});

//-------------------------------------------------------------
// FUNCTIONS
//-------------------------------------------------------------

function setArrayCount(arr, id, count){

	if(typeof(arr[id]) == "function"){
		arr[id] = 0;
	}

	var tmp = arr[id];

	if(arr[id] === undefined){
		arr[id] = parseFloat(count);
	} else {
		arr[id] += parseFloat(count);
	}

	if(isNaN(arr[id])){
		log('IS NAN');
		log(tmp);
		log(id);
		log(count);
		process.exit();
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
	for(var id in memberLikesCount){

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

	for(var id in memberCommentLength){

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
		for(var word in wordsCount){

			// frequency = word_appear/word_count
			var pi = wordsCount[word]/cwords.length;

			//  frequency[log10(number_of_unique_word) - log10(frequency)]
			sumPi += pi*( log10(cwords.length) - log10(pi) );
		}

		// calc entropy
		var entropyValue = 0;
		if(sumPi > 0){
			entropyValue = sumPi/cwords.length;
		}

		if(isNaN(entropyValue)){
			log('ENTROPY NAN:');
			log(cwords);
			log(wordsCount);
			log(sumPi);
			log(c);
			process.exit();
		}

		commentEntropy[c.id] = { member_id: c.member_id, entropy: entropyValue, c:c };
		commentEntropyCount += entropyValue;
	}

	// log('COMMENT ENTROPY');
	// log(commentEntropy);

	// calc member entropy
	for(var cid in commentEntropy){

		var comment = commentEntropy[cid];

		var entropy = 0;
		if(commentEntropyCount > 0){
			entropy = comment.entropy/commentEntropyCount;
		}

		if(isNaN(entropy)){

			log('isNaN -> commentEntropy');
			log(c);
			log(comment.entropy);
			log(commentEntropyCount);
		}

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
		for(var term in termOccur){

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

		if(isNaN(tfidf)){
			log('TFIDF NAN:');
			log(commentsTermOccur);
			log(commentsTFIDF);
			log(tfidfCount);
			process.exit();
		}

		scoreTFIDF = setArrayCount(scoreTFIDF, 'ID_'+memberId, tfidf);
	}

	return scoreTFIDF;
}

function tf(i, termsOccur){

	var sumFrequency = 0;
	for(var term in termsOccur){
		sumFrequency += termsOccur[term];
	}

	return termsOccur[i]/sumFrequency;
}

function idf(i, commentsTermOccur){

	var termOccurCount = 0;
	for(var index in commentsTermOccur){

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

			query("SELECT * FROM java_comments WHERE post_id = '"+post.id+"' AND member_id != '"+post.member_id+"'", function(comments){
				
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
					for(var id in scoreLikes){

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

	for(var id in arr){

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

	for(var id in arr){

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

function initPageRank(all_member){

	var pageRank = [];

	for (var i = 0; i < all_member.length; i++) {

		pageRank[all_member[i]] = 1/all_member.length;
	};

	return pageRank;
}

function calPageRank(pageRankRef){

	var newPageRank = clone(pageRankRef); // for merge array
	var d = 0.85;
	var m = Object.keys(pageRankRef).length;

	for (var i = 0; i < all_member.length; i++) {
		
		var memberId = all_member[i];

		// find income sumPageRank
		var sumPageRank = 0;
		var memberInNodeList = communityExpertiseNetworkIn[memberId];

		if(memberInNodeList !== undefined){

			for(var j = 0; j< memberInNodeList.length; j++){

				var memberIn = memberInNodeList[j];

				// link out count default is 1
				var outCount = communityExpertiseNetworkOut[memberIn] !== undefined ? 
				communityExpertiseNetworkOut[memberIn].length + 1 : 1;

				// r(j)/N(j)
				sumPageRank += pageRankRef[memberIn]/outCount;
			}

			// (1-d)/m + d*SUM(r(j)/N(j))
			newPageRank[memberId] = (nScoreArray[memberId]*(1-d)) + (d*sumPageRank);
		}
	};

	return newPageRank;
}

function createCommunityExpertiseNetwork(callback){

	var eachPostCounter = 0;

	query('(SELECT DISTINCT member_comment_id AS id FROM java_post_members) UNION (SELECT DISTINCT member_post_id AS id FROM java_post_members)', function(members_row){

		for(var i=0; i<members_row.length; i++){

			// post
			var row = members_row[i];

			// keep member
			if(all_member.indexOf('ID_'+row.id) === -1){
				all_member.push('ID_'+row.id);
			}

			// get who the member_comment comment to
			query('SELECT * FROM java_post_members WHERE member_comment_id = '+row.id+' AND member_post_id != '+row.id+'; SELECT * FROM java_post_members WHERE member_post_id = '+row.id+' AND member_comment_id != '+row.id, function(results){

				// result: SELECT * FROM java_post_members WHERE member_comment_id = ?	
				if(results[0].length > 0){
					addCommunityExpertiseNetworkIn(results[0]);
				}
				
				// result: SELECT * FROM java_post_members WHERE member_post_id = ?
				if(results[1].length > 0){
					addCommunityExpertiseNetworkOut(results[1]);
				}
				
			}).on('end', function(){

				if(++eachPostCounter === members_row.length){

					callback();
				}

			});
		}

	});
}

function addCommunityExpertiseNetworkIn(rows){

	// get member
	for(var i=0; i<rows.length; i++){

		// post list
		var row = rows[i];

		// add member
		if(all_member.indexOf('ID_'+row.member_post_id) === -1){
			all_member.push('ID_'+row.member_post_id);
		}

		if( ! communityExpertiseNetworkIn['ID_'+row.member_comment_id]){

			// decare member comment
			communityExpertiseNetworkIn['ID_'+row.member_comment_id] = [];
			communityExpertiseNetworkIn['ID_'+row.member_comment_id].push('ID_'+row.member_post_id);

		} else if(communityExpertiseNetworkIn['ID_'+row.member_comment_id].indexOf('ID_'+row.member_post_id) === -1){

			// add post member when not exist
			communityExpertiseNetworkIn['ID_'+row.member_comment_id].push('ID_'+row.member_post_id);
		}
		
	}

}

function addCommunityExpertiseNetworkOut(rows){

	// get member
	for(var i=0; i<rows.length; i++){

		// post list
		var row = rows[i];

		// add member
		if(all_member.indexOf('ID_'+row.member_comment_id) === -1){
			all_member.push('ID_'+row.member_comment_id);
		}

		if( ! communityExpertiseNetworkOut['ID_'+row.member_post_id]){

			// decare member comment
			communityExpertiseNetworkOut['ID_'+row.member_post_id] = [];
			communityExpertiseNetworkOut['ID_'+row.member_post_id].push('ID_'+row.member_comment_id);

		} else if(communityExpertiseNetworkOut['ID_'+row.member_post_id].indexOf('ID_'+row.member_comment_id) === -1){

			// add post member when not exist
			communityExpertiseNetworkOut['ID_'+row.member_post_id].push('ID_'+row.member_comment_id);
		}
		
	}
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

		console.log('QUERY: '+sql);
		console.log(data);
		console.log('\n');

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
	for(var id in arr){

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

	for(var id in arr1){

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