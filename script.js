// ── STATE ENGINE CONFIG ──
const state = {
    currentGrade: 5,
    currentTopicId: null,
    quizCount: 0,
    quizIndex: 0,
    score: 0,
    currentQuestion: null,
    curriculumData: null, // Loaded dynamically from JSON
    ragData: JSON.parse(localStorage.getItem('gcseRAG')) || {}
};

// ── DOM ELEMENTS REFS ──
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const gradeGrid = document.getElementById('gradeGrid');
const topicList = document.getElementById('topicList');
const selectedGradeDisplay = document.getElementById('selectedGradeDisplay');
const flashcardTitle = document.getElementById('flashcardTitle');
const flashcardBody = document.getElementById('flashcardBody');
const quizConfig = document.getElementById('quizConfig');
const quizInterface = document.getElementById('quizInterface');
const questionCounter = document.getElementById('questionCounter');
const scoreDisplay = document.getElementById('scoreDisplay');
const questionText = document.getElementById('questionText');
const choicesGrid = document.getElementById('choicesGrid');
const feedbackPanel = document.getElementById('feedbackPanel');
const feedbackContent = document.getElementById('feedbackContent');
const ragGrid = document.getElementById('ragGrid');

// ── INIT APP LAYER ──
document.addEventListener('DOMContentLoaded', () => {
    // Fetch the curriculum JSON file asynchronously
    fetch('curriculum.json')
        .then(response => {
            if (!response.ok) throw new Error("Failed to load curriculum mapping data file.");
            return response.json();
        })
        .then(data => {
            state.curriculumData = data;
            loadCurriculum();
            setupNavigation();
            setupQuizConfig();
            renderRAG();
        })
        .catch(err => {
            console.error(err);
            alert("Error loading structural JSON curriculum database. Please run code on a local web server (e.g. Live Server).");
        });
});

// ── APP NAVIGATION SYSTEM ──
function setupNavigation() {
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(btn.dataset.target).classList.add('active');
            if (btn.dataset.target === 'analytics') renderRAG();
        });
    });
}

// ── CURRICULUM MANAGEMENT ENGINE ──
function loadCurriculum() {
    gradeGrid.innerHTML = '';
    for (let g = 1; g <= 9; g++) {
        const card = document.createElement('div');
        card.className = 'grade-card';
        card.textContent = `Grade ${g}`;
        card.addEventListener('click', () => selectGrade(g));
        gradeGrid.appendChild(card);
    }
    selectGrade(5);
}

function selectGrade(g) {
    state.currentGrade = g;
    selectedGradeDisplay.textContent = g;
    topicList.innerHTML = '';
    
    const key = `grade${g}`;
    const topics = state.curriculumData && state.curriculumData[key] ? state.curriculumData[key] : [];
    
    if (topics.length === 0) {
        topicList.innerHTML = `<p style="padding:1rem; color:var(--text-secondary);">Practice models for Grade ${g} are currently updating. Please select Grade 5 modules.</p>`;
        return;
    }

    topics.forEach(t => {
        const card = document.createElement('div');
        card.className = 'topic-card';
        card.textContent = t.title;
        card.addEventListener('click', () => openFlashcard(t));
        topicList.appendChild(card);
    });
}

function openFlashcard(topic) {
    state.currentTopicId = topic.id || `grade${state.currentGrade}_${topic.title.toLowerCase().replace(/\s+/g, '_')}`;
    flashcardTitle.textContent = topic.title;
    flashcardBody.innerHTML = `
        <div style="margin-bottom:1.5rem; font-family:var(--font); text-align:left;">
            <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom:1rem;">${topic.explanation}</p>
            <h4 style="margin-top:1rem; margin-bottom:0.5rem; color:var(--primary);">Worked Example (Exam Standard):</h4>
            <div style="background:#fff; padding:1rem; border-left:4px solid var(--primary); border-radius:4px; font-family:monospace; font-size:0.95rem;">
                ${topic.examples.join('\n\n')}
            </div>
        </div>
        <button class="btn-primary" style="margin-top:1rem; width:100%;" id="startPractice">Start Practice Loading →</button>
    `;
    
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('flashcards').classList.add('active');
    
    document.getElementById('startPractice').addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('[data-target="quiz"]').classList.add('active');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById('quiz').classList.add('active');
        quizConfig.style.display = 'block';
        quizInterface.style.display = 'none';
    });
}

document.getElementById('backToDashboard').addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-target="dashboard"]').classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('dashboard').classList.add('active');
});

// ── PROCEDURAL QUIZ PROCESSOR ──
function setupQuizConfig() {
    document.querySelectorAll('.btn-config').forEach(btn => {
        btn.addEventListener('click', (e) => {
            state.quizCount = parseInt(e.target.dataset.count);
            state.quizIndex = 0;
            state.score = 0;
            quizConfig.style.display = 'none';
            quizInterface.style.display = 'block';
            feedbackPanel.style.display = 'none';
            choicesGrid.innerHTML = '';
            nextQuestion();
        });
    });

    document.getElementById('nextQuestion').addEventListener('click', () => {
        feedbackPanel.style.display = 'none';
        choicesGrid.innerHTML = '';
        if (state.quizIndex < state.quizCount) {
            nextQuestion();
        } else {
            alert(`Practice Set Complete!\nFinal Diagnostic Score: ${state.score} / ${state.quizCount}`);
            views.forEach(v => v.classList.remove('active'));
            navBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('[data-target="analytics"]').classList.add('active');
            document.getElementById('analytics').classList.add('active');
            renderRAG();
        }
    });
}

function nextQuestion() {
    state.currentQuestion = generateProceduralQuestion(state.currentTopicId);
    questionCounter.textContent = `Question ${state.quizIndex + 1} of ${state.quizCount}`;
    scoreDisplay.textContent = `Score: ${state.score}`;
    questionText.textContent = state.currentQuestion.question;
    
    state.currentQuestion.choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.textContent = choice;
        btn.addEventListener('click', () => handleAnswer(choice, btn));
        choicesGrid.appendChild(btn);
    });
}

function handleAnswer(selected, btnEl) {
    const isCorrect = selected === state.currentQuestion.correctAnswer;
    const btns = choicesGrid.querySelectorAll('button');
    btns.forEach(b => b.disabled = true);
    
    if (isCorrect) {
        btnEl.classList.add('correct');
        state.score++;
    } else {
        btnEl.classList.add('incorrect');
        btns.forEach(b => { 
            if (b.textContent === state.currentQuestion.correctAnswer) b.classList.add('correct'); 
        });
    }
    
    feedbackContent.innerHTML = state.currentQuestion.explanation;
    feedbackPanel.style.display = 'block';
    state.quizIndex++;
    
    updateRAG(state.currentTopicId, isCorrect);
}

// ── RAG ANALYTICS LOGIC ──
function updateRAG(topicId, isCorrect) {
    if (!state.ragData[topicId]) state.ragData[topicId] = { attempts: 0, correct: 0 };
    state.ragData[topicId].attempts++;
    if (isCorrect) state.ragData[topicId].correct++;
    localStorage.setItem('gcseRAG', JSON.stringify(state.ragData));
}

function renderRAG() {
    ragGrid.innerHTML = '';
    const key = `grade${state.currentGrade}`;
    const topics = state.curriculumData && state.curriculumData[key] ? state.curriculumData[key] : [];
    
    topics.forEach(t => {
        const id = t.id || `grade${state.currentGrade}_${t.title.toLowerCase().replace(/\s+/g, '_')}`;
        const data = state.ragData[id] || { attempts: 0, correct: 0 };
        const accuracy = data.attempts === 0 ? 0 : Math.round((data.correct / data.attempts) * 100);
        
        let ragClass = 'red';
        if (data.attempts > 0) {
            if (accuracy >= 50 && accuracy < 85) ragClass = 'amber';
            if (accuracy >= 85) ragClass = 'green';
        }
        
        const card = document.createElement('div');
        card.className = `rag-card ${ragClass}`;
        card.innerHTML = `
            <div style="font-weight:600; min-height:40px;">${t.title}</div>
            <div class="accuracy">${data.attempts === 0 ? 'N/A' : accuracy + '%'}</div>
            <div class="count">${data.attempts} attempts</div>
        `;
        card.style.cursor = 'default';
        ragGrid.appendChild(card);
    });
}

// ── CORE PROCEDURAL MATHEMATICS GENERATION ALGORITHMS ──
function generateProceduralQuestion(topicId) {
    if (!topicId) topicId = 'grade5_writing_ratio_fraction';

    switch(topicId) {
        case 'grade5_writing_ratio_fraction': {
            const a = Math.floor(Math.random() * 12) + 2;
            const b = Math.floor(Math.random() * 12) + 2;
            const correct = `${a} / ${a + b}`;
            const questionText = `A box contains red counters and blue counters in the ratio ${a}:${b}. What fraction of the total counters are red?`;
            const distractors = new Set([`${b} / ${a + b}`, `${a} / ${b}`, `${b} / ${a}`]);
            distractors.delete(correct);
            const choices = [correct, ...Array.from(distractors).slice(0, 3)].sort(() => Math.random() - 0.5);
            return {
                question: questionText,
                correctAnswer: correct,
                choices: choices,
                explanation: `Ratio Red:Blue = ${a}:${b}.\nTotal Parts = ${a} + ${b} = ${a + b}.\nFraction Red = Red Parts / Total Parts = ${a} / ${a + b}.`
            };
        }

        case 'grade5_direct_inverse_proportion': {
            const isInverse = Math.random() > 0.5;
            const k = (Math.floor(Math.random() * 5) + 2) * 4; 
            const x1 = 2;
            const y1 = isInverse ? k / x1 : k * x1;
            const x2 = 4;
            const correctAnswer = isInverse ? k / x2 : k * x2;
            const questionText = isInverse 
                ? `y is inversely proportional to x. When x = ${x1}, y = ${y1}. Find y when x = ${x2}.`
                : `y is directly proportional to x. When x = ${x1}, y = ${y1}. Find y when x = ${x2}.`;
            const distractors = new Set([(isInverse ? k * x2 : k / x2).toString(), (correctAnswer + 4).toString(), (correctAnswer / 2).toString()]);
            distractors.delete(correctAnswer.toString());
            const choices = [correctAnswer.toString(), ...Array.from(distractors).slice(0, 3)].sort(() => Math.random() - 0.5);
            return {
                question: questionText,
                correctAnswer: correctAnswer.toString(),
                choices: choices,
                explanation: isInverse 
                    ? `Inverse: y = k/x => k = y * x = ${y1} * ${x1} = ${k}.\nWhen x = ${x2}: y = ${k} / ${x2} = ${correctAnswer}.`
                    : `Direct: y = kx => k = y/x = ${y1}/${x1} = ${k}.\nWhen x = ${x2}: y = ${k} * ${x2} = ${correctAnswer}.`
            };
        }

        case 'grade5_reverse_percentages': {
            const percentage = [10, 20, 25, 50][Math.floor(Math.random() * 4)];
            const original = (Math.floor(Math.random() * 5) + 1) * 40; 
            const isIncrease = Math.random() > 0.5;
            const multiplier = isIncrease ? (1 + percentage/100) : (1 - percentage/100);
            const finalAmount = original * multiplier;
            const correct = `£${original}`;
            const questionText = `An item was ${isIncrease ? 'increased' : 'reduced'} by ${percentage}% in a clearance sale. Its new price is £${finalAmount}. Work out its original price.`;
            const choices = [correct, `£${finalAmount + (finalAmount * percentage/100)}`, `£${original - 10}`, `£${original + 20}`].sort(() => Math.random() - 0.5);
            return {
                question: questionText,
                correctAnswer: correct,
                choices: choices,
                explanation: `Multiplier for ${percentage}% ${isIncrease ? 'increase' : 'decrease'} = ${multiplier}.\nOriginal Value = New Value ÷ Multiplier\n£${finalAmount} ÷ ${multiplier} = £${original}.`
            };
        }

        case 'grade5_standard_form': {
            const exp = Math.floor(Math.random() * 4) + 3; 
            const base = (Math.random() * 5 + 1.1).toFixed(2);
            const val = Math.round(parseFloat(base) * Math.pow(10, exp));
            const correct = `${base} × 10^${exp}`;
            const choices = [correct, `${base} × 10^${exp - 1}`, `${parseFloat(base) * 10} × 10^${exp}`, `${base} × 10^-${exp}`].sort(() => Math.random() - 0.5);
            return {
                question: `Write the number ${val.toLocaleString()} in standard mathematical index form.`,
                correctAnswer: correct,
                choices: choices,
                explanation: `Shift decimal point to find a variant value matching scale limits 1 ≤ n < 10 (${base}).\nDecimal step tracking moved ${exp} places left, producing index factor: 10^${exp}.`
            };
        }

        case 'grade5_speed_density': {
            const speed = Math.floor(Math.random() * 15) + 10; 
            const time = Math.floor(Math.random() * 4) + 2; 
            const correct = `${speed * time} m`;
            return {
                question: `A cyclist travels at a constant velocity speed rate of ${speed} m/s for exactly ${time} seconds. Find the total distance covered.`,
                correctAnswer: correct,
                choices: [correct, `${Math.round(speed / time)} m`, `${speed + time} m`, `${speed * time * 2} m`].sort(() => Math.random() - 0.5),
                explanation: `Formula: Distance = Speed × Time\nDistance = ${speed} m/s × ${time} s = ${speed * time} meters.`
            };
        }

        case 'grade5_changing_subject': {
            const a = Math.floor(Math.random() * 5) + 2;
            const b = Math.floor(Math.random() * 8) + 1;
            const correct = `x = (y - ${b}) / ${a}`;
            return {
                question: `Rearrange the structural formula y = ${a}x + ${b} to isolate and make variable [x] the subject.`,
                correctAnswer: correct,
                choices: [correct, `x = (y + ${b}) / ${a}`, `x = y - ${b} / ${a}`, `x = ${a}(y - ${b})`].sort(() => Math.random() - 0.5),
                explanation: `1) Balance addition parameters by subtracting ${b}: y - ${b} = ${a}x\n2) Isolate factor x by dividing through scalar weight multiplier ${a}: x = (y - ${b}) / ${a}.`
            };
        }

        case 'grade5_expanding_factorising_quadratics': {
            const val = Math.floor(Math.random() * 7) + 3;
            const correct = `x² - ${val * val}`;
            return {
                question: `Expand and cleanly simplify the expression: (x + ${val})(x - ${val})`,
                correctAnswer: correct,
                choices: [correct, `x² + ${val * val}`, `x² - ${val}`, `x² - ${2 * val}x - ${val * val}`].sort(() => Math.random() - 0.5),
                explanation: `Utilizing Difference of Two Squares identity layout rules: (a+b)(a-b) = a² - b².\nYields directly: x² - ${val}² = x² - ${val * val}.`
            };
        }

        case 'grade5_solving_quadratics': {
            const r1 = Math.floor(Math.random() * 3) + 2; 
            const r2 = Math.floor(Math.random() * 3) + 5; 
            const b = -(r1 + r2);
            const c = r1 * r2;
            const correct = `x = ${r1} or x = ${r2}`;
            return {
                question: `Solve the quadratic system equation: x² ${b}x + ${c} = 0`,
                correctAnswer: correct,
                choices: [correct, `x = -${r1} or x = -${r2}`, `x = ${r1} or x = -${r2}`, `x = 0 or x = ${c}`].sort(() => Math.random() - 0.5),
                explanation: `Equation splits into factored binomial states: (x - ${r1})(x - ${r2}) = 0.\nRoots calculate down to inverse zero constraints: x = ${r1} or x = ${r2}.`
            };
        }

        case 'grade5_drawing_quadratic_graphs': {
            const shift = Math.floor(Math.random() * 6) + 2;
            const correct = `(0, -${shift})`;
            return {
                question: `Identify the coordinate minimum turning vertex point for the curve map: y = x² - ${shift}`,
                correctAnswer: correct,
                choices: [correct, `(0, ${shift})`, `(-${shift}, 0)`, `(1, -${shift})`].sort(() => Math.random() - 0.5),
                explanation: `The tracking path function y = x² shifts structural lines vertically downwards by ${shift} units. Axis center values remain fixed at x=0, generating minimum coordinates: (0, -${shift}).`
            };
        }

        case 'grade5_solving_simultaneous_graphically': {
            const cx = Math.floor(Math.random() * 3) + 1;
            const cy = Math.floor(Math.random() * 3) + 3;
            const correct = `x = ${cx}, y = ${cy}`;
            return {
                question: `Two linear function equations intersect on cross axes. Find the coordinates solution if their graphical intersection sits right on point (${cx}, ${cy}).`,
                correctAnswer: correct,
                choices: [correct, `x = ${cy}, y = ${cx}`, `x = ${cx + 1}, y = ${cy - 1}`, `x = 0, y = 0`].sort(() => Math.random() - 0.5),
                explanation: `The intersection intersection coordinate point where line cross systems meet provides the spatial parameters answering both equations simultaneously.`
            };
        }

        case 'grade5_gradient_of_a_line': {
            const run = 2;
            const x1 = 1;
            const y1 = Math.floor(Math.random() * 3) + 2;
            const m = Math.floor(Math.random() * 4) + 2;
            const y2 = y1 + (m * run);
            const x2 = x1 + run;
            const correct = m.toString();
            return {
                question: `Find the calculation gradient step slope metric variable line track moving straight through parameters (${x1}, ${y1}) and (${x2}, ${y2}).`,
                correctAnswer: correct,
                choices: [correct, (1/m).toFixed(2), (m*2).toString(), (m-1).toString()].sort(() => Math.random() - 0.5),
                explanation: `Gradient Formula: m = (y₂ - y₁) / (x₂ - x₁).\nSubstituting parameters: (${y2} - ${y1}) / (${x2} - ${x1}) = ${y2 - y1} / ${run} = ${m}.`
            };
        }

        case 'grade5_equation_of_a_line': {
            const m = Math.floor(Math.random() * 3) + 2;
            const c = Math.floor(Math.random() * 5) + 1;
            const correct = `y = ${m}x + ${c}`;
            return {
                question: `Formulate line equations passing straight down an axis with slope evaluation gradient index equal to ${m} alongside localized vertical axis configuration coordinate entry point at (0, ${c}).`,
                correctAnswer: correct,
                choices: [correct, `y = ${c}x + ${m}`, `y = ${m}x - ${c}`, `y = -${m}x + ${c}`].sort(() => Math.random() - 0.5),
                explanation: `Standard line structural track equation form: y = mx + c.\nGiven gradient parameters m = ${m} and intersection parameter offset c = ${c} yields: y = ${m}x + ${c}.`
            };
        }

        case 'grade5_spheres_and_cones': {
            const r = 3; 
            const h = 7;
            const v = (1/3) * Math.PI * (r*r) * h;
            const correct = `${Math.round(v)} cm³`;
            return {
                question: `Calculate volume capacity structural specifications tracking along geometric cones holding base circular radius radius = ${r} cm and height metrics spanning = ${h} cm. (Round to nearest whole number)`,
                correctAnswer: correct,
                choices: [correct, `${Math.round(v * 3)} cm³`, `${Math.round(v / 2)} cm³`, `45 cm³`].sort(() => Math.random() - 0.5),
                explanation: `Volume tracking equation layout: V = (1/3) * π * r² * h.\nSubstituting parameters: (1/3) * π * (3²) * 7 = (1/3) * π * 9 * 7 = 21π ≈ ${Math.round(v)} cm³.`
            };
        }

        case 'grade5_sector_areas_and_arc_lengths': {
            const r = 6;
            const angle = 60;
            const correct = `2π cm`;
            return {
                question: `Determine the exact proportional boundary outer arc length tracking across circular structural slice holding radius metric = ${r} cm bounded internally via sector angle = ${angle}°.`,
                correctAnswer: correct,
                choices: [correct, `6π cm`, `12π cm`, `π cm`].sort(() => Math.random() - 0.5),
                explanation: `Arc path calculation formula = (θ / 360) * 2 * π * r.\nApplying parameters: (${angle} / 360) * 2 * π * 6 = (1 / 6) * 12π = 2π cm.`
            };
        }

        default: {
            const a = Math.floor(Math.random() * 5) + 2;
            const b = Math.floor(Math.random() * 5) + 2;
            return {
                question: `Simplify expression: evaluate combined statement total values of ${a}x + ${b}x.`,
                correctAnswer: `${a + b}x`,
                choices: [`${a + b}x`, `${a * b}x`, `${a + b}x²`, `${a}x`],
                explanation: `Sum together like algebraic structural unit variables directly: ${a} + ${b} = ${a + b}x.`
            };
        }
    }
}