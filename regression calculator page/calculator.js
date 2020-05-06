
function calculate() {
	let radioButtons = document.getElementsByName('party')
	let checkedButton = -1
	let coeffArray = [
	[7.73E-07, -3.31E-06, 0, -0.003378891],
	[2.31E-06, -6.79E-06, 0, -0.028513051],
	[1.23E-06, 4.18E-06, 0, -0.018922117],
	[-7.31E-07, -3.39E-06, 0, 0.032459363],
	[1.44E-06, 4.55E-06, 0, -0.023958236],
	[8.13E-07, -3.00E-06, -0.002938244, -0.002192334],
	[2.40E-06, -6.20E-06, -0.008645814, -0.023916752],
	[1.33E-06, 4.90E-06, -0.007878257, -0.015286509],
	[-6.00E-07, -2.89E-06, -0.009952291, 0.035697463],
	[1.40E-06, 4.62E-06, 0.003822507, -0.026499733]]

	for (var i = 0 ; i < radioButtons.length ; i++){
		if (radioButtons[i].checked){
			checkedButton = i
			console.log(i)
		}
	}
	
	age = document.getElementById('age').value
	termLength = document.getElementById('termLength').value
	approvalVal = document.getElementById('approval')
	coeffIndex  = approvalVal.value == '' ? 0 : 5
	console.log(coeffIndex)
	coeffIndex += checkedButton
	console.log(coeffIndex)
	console.log(coeffArray[coeffIndex])
	ourCoeff = coeffArray[coeffIndex]
	let result = document.getElementById("result")
	approvalVal.value = approvalVal.value == '' ? 0 : approvalVal.value
	let calculatedValue = (ourCoeff[0] * age*365 + ourCoeff[1] * termLength *365 + ourCoeff[2] * parseInt(approvalVal.value) + ourCoeff[3]) 
	console.log(calculatedValue)
	if (calculatedValue < 0){
		calculatedValue = 0
	}
	calculatedValue = calculatedValue.toFixed(4)
	result.innerHTML = calculatedValue + 	"% of foreign contract value is estimated to be with foreign entities"
	

}

function onload(){
}