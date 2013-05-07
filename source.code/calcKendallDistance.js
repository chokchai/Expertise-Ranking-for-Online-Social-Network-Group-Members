var fs = require('fs');

var expertAnswerFile = 'eco_expert_answer.txt';
var systemAnswerFile = 'eco_system_answer_no-attr.txt';

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

var kendallRes = [];
var sumKendall = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

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

		var choiceIndexArray = ['A','B','C','D','E'];

		var count = 0;

		for(var k=0; k<n; k++){
			for(var l=k+1; l<n; l++){

				var sysOrder = '';
				var expOrder = '';

				var ik = choiceIndexArray[k];
				var il = choiceIndexArray[l];

				if(expChoiceIndex[ik] < expChoiceIndex[il]){
					expOrder = 'less.than';
				} else {
					expOrder = 'more.than';
				}

				if(sysChoiceIndex[ik] < sysChoiceIndex[il]){
					sysOrder = 'less.than';
				} else {
					sysOrder = 'more.than';
				}

				if(expOrder !== sysOrder){
					count++;	
				}
			}
		} // for k

		var K = count/( (n*(n-1)) / 2 );

		res[j] = { count:count, K:K };
		sumKendall[j] += K;

	} // for j

	kendallRes.push(res);

}

log('\n#KENDALL DISTANCE RESULTS');
log(kendallRes);

log('\n#KENDALL DISTANCE per expert');
for(var i in kendallRes){

	var sum = 0;
	for(j in kendallRes[i]){

		sum += kendallRes[i][j].K;
	}

	log('['+(parseInt(i)+1)+'] = '+sum/20);
}

log('\n#KENDALL DISTANCE per exam');
for(var i in sumKendall){
	log('['+(parseInt(i)+1)+'] = '+sumKendall[i]/kendallRes.length);
}

var meanKendall = 0;
for(var i in sumKendall){
	meanKendall += sumKendall[i];
}

log('\n#KENDALL DISTANCE Mean = '+meanKendall/(kendallRes.length*20));

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