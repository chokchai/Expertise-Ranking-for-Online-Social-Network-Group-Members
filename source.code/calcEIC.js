var fs = require('fs');

var expertAnswerFile = 'eic_expert_answer.txt';
var systemAnswerFile =  'eic_system_answer_no-attr.txt';

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

var results = [];
var sumEIC = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

// each answerer
for(var i=0; i<expertAnswerList.length; i+=20){

	var res = [];

	// each sysAnswer
	for(var j=0; j<20; j++){

		var expAnswer = expertAnswerList[i+j].split('');
		var sysAnswer = systemAnswerList[j].split('');

		res[j] = {correct: 0, incorrect: 0, EIC:0 }; //, expAnswer: expertAnswerList[i+j], sysAnswer: systemAnswerList[j]};

		// when answer is no
		if(sysAnswer[0] === '-'){

			var len = sysAnswer.length;

			res[j].correct = len - expAnswer.length;
			res[j].incorrect = len - res[j].correct;

		} else {

			if(getUnique(expAnswer).length !== expAnswer.length){
				log('expertise answer is not unique '+expAnswer.join('')+'. member: '+(i/20+1)+' question: '+(j+1));
				process.exit();
			}

			if(getUnique(sysAnswer).length !== sysAnswer.length){
				log('system answer is not unique '+sysAnswer.join('')+' question: '+(j+1));
				process.exit();
			}

			if(sysAnswer.length < expAnswer.length){

				res[j].incorrect = expAnswer.length - sysAnswer.length;
			}

			for(var k=0; k<sysAnswer.length; k++){

				if(expAnswer.indexOf(sysAnswer[k]) !== -1){
					res[j].correct += 1;
				} else {
					res[j].incorrect += 1;
				}

			}// end for k
		}

		

	}// end for j

	for(var j=0; j<res.length; j++){
		res[j].EIC = res[j].correct/(res[j].correct+res[j].incorrect);
		sumEIC[j] += res[j].EIC;
	}

	results.push(res);

}// end for i

log('\n#RESULTS');
log(results);

log('\n#EIC per expert');
for(var i in results){

	var sum = 0;
	for(j in results[i]){

		sum += results[i][j].EIC;
	}

	log('['+(parseInt(i)+1)+'] = '+sum/20);
}

log('\n#EIC per exam');
for(var i in sumEIC){
	log('['+(parseInt(i)+1)+'] = '+sumEIC[i]/results.length);
}

var meanEIC = 0;
for(var i in sumEIC){
	meanEIC += sumEIC[i];
}

log('\n#EIC per 5 rows');
for(var i=0; i<4; i++){

	var sum = 0;
	for(var j=0; j<5; j++){

		sum += sumEIC[(i*5) + j]/results.length;
	}

	log('['+(i+1)+'] = '+sum/5);
}

log('\n#EIC mean all expert = '+((sumEIC[2]+sumEIC[3]+sumEIC[8]+sumEIC[9]+sumEIC[10]+sumEIC[14]+sumEIC[15]+sumEIC[16]+sumEIC[18]+sumEIC[19])/(10*results.length)));
log('\n#EIC mean have non-expert = '+((sumEIC[0]+sumEIC[1]+sumEIC[4]+sumEIC[5]+sumEIC[6]+sumEIC[7]+sumEIC[11]+sumEIC[12]+sumEIC[13]+sumEIC[17])/(10*results.length)));

log('\n#EIC mean = '+meanEIC/(results.length*20));

process.exit();

//----- FUNCTION -----//

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
