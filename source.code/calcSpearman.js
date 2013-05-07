var fs = require('fs');

var expertAnswerFile = 'eco_expert_answer.txt';
var systemAnswerFile = 'eco_system_answer.txt';

var expertAnswerList = cleanList(fs.readFileSync(expertAnswerFile, 'utf8').split('\r\n'));
var systemAnswerList = cleanList(fs.readFileSync(systemAnswerFile, 'utf8').split('\r\n'));

// validation number of question and answer
if(expertAnswerList.length % 20 > 0){
	log('expertAnswerFile is not corrected: number of answer is not % 20 === 0 (is '+expertAnswerList.length+')');
	process.exit();
}

if(systemAnswerList.length % 20 > 0){
	log('systemAnswerList is not corrected: number of answer is must be 20 (is '+expertAnswerList.length+')');
	process.exit();
}

var spearmanRes = [];
var sumSpearman = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

// each answerer
for(var i=0; i<expertAnswerList.length; i+=20){

	var res = [];

	// each sysAnswer
	for(var j=0; j<20; j++){

		var expAnswer = expertAnswerList[i+j].split('');
		var sysAnswer = systemAnswerList[j].split('');

		// validation answer
		if(expAnswer.length !== sysAnswer.length){
			log(expAnswer);
			log(sysAnswer);

			log('expertise answer and system answer is not equal. member: '+((i/20)+1)+' question: '+(j+1));
			process.exit();
		}

		if(getUnique(expAnswer).length !== expAnswer.length){
			log('expertise answer is not unique '+expAnswer.join('')+'. member: '+((i/20)+1)+' question: '+(j+1));
			process.exit();
		}

		if(getUnique(sysAnswer).length !== sysAnswer.length){
			log('system answer is not unique '+sysAnswer.join('')+' question: '+(j+1));
			process.exit();
		}

		// Ex. { A:2, B:1, C:3 }
		var expChoiceIndex = swapIndexAndValue(expAnswer);
		var sysChoiceIndex = swapIndexAndValue(sysAnswer);
		
		var n = expAnswer.length;

		var d = [];
		var choiceIndexArray = ['A','B','C','D','E'];

		for(var k=0; k<n; k++){

			var choiceIndex = choiceIndexArray[k];
			// d each question
			d[k] = Math.abs(expChoiceIndex[choiceIndex]-sysChoiceIndex[choiceIndex]);
		}

		// is d^2
		var D = [];
		var sumD = 0;
		for(var k in d){
			D[k] = Math.pow(d[k], 2);
			sumD += D[k];
		}

		var p = 1 - ( (6*sumD) / (n*(Math.pow(n,2) - 1)) );

		res[j] = { d:d, D:D, sumD:sumD, p:p };
		sumSpearman[j] += p;

	}

	spearmanRes.push(res);

}

log('\n#SPEARMAN RESULTS');
log(spearmanRes);

log('\n#SPEARMAN per expert');
for(var i in spearmanRes){

	var sum = 0;
	for(j in spearmanRes[i]){

		sum += spearmanRes[i][j].p;
	}

	log('['+(parseInt(i)+1)+'] = '+sum/20);
}

log('\n#SPEARMAN per exam');
for(var i in sumSpearman){
	log('['+(parseInt(i)+1)+'] = '+sumSpearman[i]/spearmanRes.length);
}

var meanSpearman = 0;
for(var i in sumSpearman){
	meanSpearman += sumSpearman[i];
}

log('\n#SPEARMAN Mean = '+meanSpearman/(spearmanRes.length*20));

process.exit();

//----- FUNCTION -----//

function swapIndexAndValue(arr){

	var index = {};

	for(var i in arr){
		index[arr[i]] = parseInt(i) + 1;
	}

	return index;

}

function log(obj){
	console.log(obj);
}

function cleanList(arr){
	
	var array = [];
	
	arr.forEach(function(val){
		val = val.trim();
		if(val !== '' && val.indexOf('#') === -1 && val.indexOf('//') === -1){
			array.push(val);
		}
	});

	return array;
}

function getUnique(arr){
   var u = {}, a = [];
   for(var i = 0, l = arr.length; i < l; ++i){
      if(u.hasOwnProperty(arr[i])) {
         continue;
      }
      a.push(arr[i]);
      u[arr[i]] = 1;
   }
   return a;
}