document.addEventListener('DOMContentLoaded', function() {
    // Load game stats from localStorage
    const gameStats = JSON.parse(localStorage.getItem('gameStats') || '{}');
    
    // Display the stats
    if (gameStats.time) {
        document.getElementById('time-stat').textContent = formatTime(gameStats.time);
    }
    
    if (gameStats.score) {
        document.getElementById('score-stat').textContent = gameStats.score;
    }
    
    // Clear the stats from storage so they don't show on future visits
    localStorage.removeItem('gameStats');
});

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}