document.addEventListener('DOMContentLoaded', function() {
    // Load wrong answers data from localStorage
    const gameData = JSON.parse(localStorage.getItem('gameData') || {});
    const wrongAnswers = gameData.wrongAnswers || [];
    const museumId = gameData.museumId;
    
    // Display wrong answers
    const wrongAnswersList = document.getElementById('wrong-answers-list');
    
    if (wrongAnswers.length > 0) {
        wrongAnswers.forEach(answer => {
            const answerItem = document.createElement('div');
            answerItem.className = 'wrong-answer-item';
            answerItem.textContent = answer.text;
            answerItem.addEventListener('click', function() {
                // Navigate to the museum section
                window.location.href = `${answer.path}?fromGame=true&id=${museumId}`;
            });
            wrongAnswersList.appendChild(answerItem);
        });
    } else {
        const noAnswers = document.createElement('div');
        noAnswers.className = 'wrong-answer-item';
        noAnswers.textContent = 'Nenhuma resposta incorreta registrada';
        noAnswers.style.cursor = 'default';
        noAnswers.style.textDecoration = 'none';
        wrongAnswersList.appendChild(noAnswers);
    }
    
    // Clear the game data from storage
    localStorage.removeItem('gameData');
});