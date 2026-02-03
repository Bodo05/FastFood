let tipoUtente = 'cliente';
let catalogoCompleto = [];
let menuRistoratore = [];

window.onload = async function() {
    try {
        const resCat = await fetch(API_URL + '/categorie-catalogo');
        const categorie = await resCat.json();

        const selectCliente = document.getElementById('prefCliente');
        const selectFiltro = document.getElementById('filtroCatalogo');

        if (selectCliente) {
            selectCliente.innerHTML = '<option value="">-- Seleziona --</option>';
            categorie.forEach(function(cat) {
                selectCliente.innerHTML += '<option value="' + cat + '">' + cat + '</option>';
            });
        }

        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
            categorie.forEach(function(cat) {
                selectFiltro.innerHTML += '<option value="' + cat + '">' + cat + '</option>';
            });
        }

        const resMeals = await fetch(API_URL + '/catalog');
        catalogoCompleto = await resMeals.json();

    } catch (errore) {
        console.error("Errore:", errore);
        showToast("Errore connessione server", "danger");
    }
}

function cambiaTab(tipo) {
    tipoUtente = tipo;

    document.getElementById('divCliente').style.display = (tipo === 'cliente') ? 'block' : 'none';
    document.getElementById('divRistoratore').style.display = (tipo === 'ristoratore') ? 'block' : 'none';

    const btnC = document.getElementById('btnTabCliente');
    const btnR = document.getElementById('btnTabRistoratore');

    if (tipo === 'cliente') {
        btnC.classList.add('active');
        btnR.classList.remove('active');
    } else {
        btnR.classList.add('active');
        btnC.classList.remove('active');
    }
}

const filtro = document.getElementById('filtroCatalogo');
if (filtro) {
    filtro.addEventListener('change', function() {
        const categoria = this.value;
        const container = document.getElementById('containerPiatti');
        container.innerHTML = '';

        if (!categoria) return;

        const piattiFiltrati = catalogoCompleto.filter(function(p) {
            return p.strCategory === categoria;
        });

        if (piattiFiltrati.length === 0) {
            container.innerHTML = '<div class="col-12 text-muted text-center">Nessun piatto trovato.</div>';
            return;
        }

        piattiFiltrati.forEach(function(p, index) {
            const giaAggiunto = menuRistoratore.some(function(m) { return m.nome === p.strMeal; });

            container.innerHTML += `
                <div class="col-md-4 col-lg-3">
                    <div class="card h-100 shadow-sm">
                        <img src="${p.strMealThumb}" class="card-img-top" style="height: 120px; object-fit: cover;">
                        <div class="card-body p-2">
                            <h6 class="card-title text-truncate">${p.strMeal}</h6>
                            <input type="number" id="prezzo_${index}" class="form-control form-control-sm mb-1" placeholder="Prezzo €" ${giaAggiunto ? 'disabled' : ''}>
                            <input type="number" id="tempo_${index}" class="form-control form-control-sm mb-2" placeholder="Minuti" value="15" ${giaAggiunto ? 'disabled' : ''}>
                            <button id="btn_${index}" class="btn btn-sm w-100 ${giaAggiunto ? 'btn-secondary' : 'btn-outline-success'}"
                                onclick="aggiungiAlMenu(${index}, '${p.strMeal.replace(/'/g, "\\'")}', '${p.strCategory}', '${p.strMealThumb}')"
                                ${giaAggiunto ? 'disabled' : ''}>
                                ${giaAggiunto ? 'In Menu' : 'Aggiungi'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    });
}

function aggiungiAlMenu(index, nome, categoria, immagine) {
    const prezzo = document.getElementById('prezzo_' + index).value;
    const tempo = document.getElementById('tempo_' + index).value;

    if (!prezzo || !tempo) {
        showToast("Inserisci prezzo e tempo!", "warning");
        return;
    }

    const originale = catalogoCompleto.find(function(p) { return p.strMeal === nome; }) || {};
    let ingredienti = [];
    
    if (originale.ingredients && Array.isArray(originale.ingredients)) {
        ingredienti = originale.ingredients;
    } else {
        for (let i = 1; i <= 20; i++) {
            const ing = originale['strIngredient' + i];
            if (ing && ing.trim()) ingredienti.push(ing);
        }
    }

    menuRistoratore.push({
        nome: nome,
        categoria: categoria,
        thumb: immagine,
        prezzo: parseFloat(prezzo),
        tempo: parseInt(tempo),
        ingredienti: ingredienti.join(', '),
        strMeal: nome,
        strCategory: categoria,
        strMealThumb: immagine
    });

    document.getElementById('btn_' + index).className = 'btn btn-sm w-100 btn-secondary';
    document.getElementById('btn_' + index).innerText = 'In Menu';
    document.getElementById('btn_' + index).disabled = true;
    document.getElementById('prezzo_' + index).disabled = true;
    document.getElementById('tempo_' + index).disabled = true;

    aggiornaRiepilogo();
}

function aggiornaRiepilogo() {
    const div = document.getElementById('menuScelto');

    if (menuRistoratore.length === 0) {
        div.innerHTML = '<small class="text-muted">Nessun piatto aggiunto.</small>';
        return;
    }

    let html = '';
    menuRistoratore.forEach(function(p) {
        html += '<span class="badge bg-primary me-1 mb-1">' + p.nome + ' €' + p.prezzo + '</span>';
    });
    div.innerHTML = html;
}

async function registrati() {
    const btn = document.getElementById('btnRegistra');
    const testoOriginale = btn.innerText;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('pass').value;
    const conferma = document.getElementById('confPass').value;

    if (!email || !email.includes('@')) {
        showToast("Email non valida", "warning");
        return;
    }

    if (password.length < 6) {
        showToast("Password minimo 6 caratteri", "warning");
        return;
    }

    if (password !== conferma) {
        showToast("Le password non coincidono", "warning");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Registrazione...";

    function resetBtn() {
        btn.disabled = false;
        btn.innerText = testoOriginale;
    }

    let payload = { email: email, password: password };
    let endpoint = '';

    if (tipoUtente === 'cliente') {
        const nome = document.getElementById('nome').value.trim();
        const cognome = document.getElementById('cognome').value.trim();
        const preferenza = document.getElementById('prefCliente').value;

        if (!nome || !cognome) {
            showToast("Inserisci nome e cognome", "warning");
            resetBtn();
            return;
        }

        payload.nome = nome;
        payload.cognome = cognome;
        payload.preferenze = preferenza ? [preferenza] : [];
        endpoint = API_URL + '/cliente';

    } else {
        const nomeRist = document.getElementById('nomeRist').value.trim();
        const indirizzo = document.getElementById('indirizzo').value.trim();
        const piva = document.getElementById('piva').value.trim();
        const telefono = document.getElementById('telefono').value.trim();

        if (!nomeRist || !indirizzo) {
            showToast("Completa i dati del ristorante", "warning");
            resetBtn();
            return;
        }

        if (!/^\d{11}$/.test(piva)) {
            showToast("P.IVA deve essere di 11 cifre", "warning");
            resetBtn();
            return;
        }

        if (menuRistoratore.length === 0) {
            showToast("Aggiungi almeno un piatto al menu!", "warning");
            resetBtn();
            return;
        }

        payload.nomeRistorante = nomeRist;
        payload.indirizzo = indirizzo;
        payload.piva = piva;
        payload.telefono = telefono;
        payload.piatti = menuRistoratore;
        endpoint = API_URL + '/ristoratore';
    }

    try {
        const risposta = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const dati = await risposta.json();

        if (risposta.ok) {
            showToast("Registrazione completata!", "success");
            setTimeout(function() {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showToast(dati.message || "Errore registrazione", "danger");
            resetBtn();
        }
    } catch (errore) {
        showToast("Errore di connessione", "danger");
        resetBtn();
    }
}