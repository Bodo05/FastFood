<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - FastFood</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body style="background-color: #e6f7ff;">

    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand" href="#">FastFood Project</a>
        </div>
    </nav>

    <div class="container d-flex align-items-center justify-content-center" style="min-height: 80vh;">
        <div class="card shadow border-0" style="max-width: 400px; width: 100%;">
            <div class="card-body p-4">
                <div class="text-center mb-4">
                    <h3 class="fw-bold text-primary">Accedi</h3>
                    <p class="text-muted">Inserisci le tue credenziali</p>
                </div>

                <form onsubmit="event.preventDefault(); login();">
                    
                    <div class="mb-3">
                        <div class="btn-group w-100" role="group">
                            <input type="radio" class="btn-check" name="userType" id="typeCliente" value="cliente" checked>
                            <label class="btn btn-outline-primary" for="typeCliente">Cliente</label>

                            <input type="radio" class="btn-check" name="userType" id="typeRistoratore" value="ristoratore">
                            <label class="btn btn-outline-primary" for="typeRistoratore">Ristoratore</label>
                        </div>
                    </div>

                    <div class="form-floating mb-3">
                        <input type="email" class="form-control" id="email" placeholder="name@example.com" required>
                        <label for="email">Indirizzo Email</label>
                    </div>

                    <div class="form-floating mb-3">
                        <input type="password" class="form-control" id="password" placeholder="Password" required>
                        <label for="password">Password</label>
                    </div>

                    <div class="d-grid mb-3">
                        <button type="submit" class="btn btn-primary btn-lg fw-bold">Login</button>
                    </div>

                    <div class="text-center">
                        <small class="text-muted">Non hai un account? <a href="registrazione.html" class="text-decoration-none">Registrati qui</a></small>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const type = document.querySelector('input[name="userType"]:checked').value;
            
            const endpoint = type === 'ristoratore' ? 'http://localhost:3000/ristoratore/login' : 'http://localhost:3000/auth/login';
            const payload = { email, password, type };

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('_id', data._id);
                    localStorage.setItem('userType', type);
                    
                    if (type === 'ristoratore') window.location.href = 'ristoratore.html';
                    else window.location.href = 'cliente.html';
                } else {
                    alert("Errore: " + (data.message || "Credenziali non valide"));
                }
            } catch (e) {
                console.error(e);
                alert("Errore di connessione al server");
            }
        }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>