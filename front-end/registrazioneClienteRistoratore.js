let userType = "cliente";
let mealsData = [];

function setType(type) {
    userType = type;
    document.getElementById("tabCliente").classList.toggle("tab-active", type==="cliente");
    document.getElementById("tabRistoratore").classList.toggle("tab-active", type==="ristoratore");
    document.getElementById("clienteFields").style.display = type==="cliente"?"block":"none";
    document.getElementById("ristoratoreFields").style.display = type==="ristoratore"?"block":"none";
}

fetch("meals1.json").then(r=>r.json()).then(data=>{
    mealsData = data;
    const preferenzeDiv = document.getElementById("preferenzeContainer");
    const categorie = [...new Set(data.map(m=>m.strCategory).filter(Boolean))];
    categorie.forEach(cat=>{
        const div=document.createElement("div");div.classList.add("form-check");
        div.innerHTML=`<input type="checkbox" class="form-check-input" id="pref_${cat}"><label for="pref_${cat}" class="form-check-label">${cat}</label>`;
        preferenzeDiv.appendChild(div);
        const opt = document.createElement("option"); opt.value=cat; opt.textContent=cat;
        document.getElementById("categoriaSelect").appendChild(opt);
    });
});

document.querySelectorAll("input[name=pagamento]").forEach(r=>{
    r.addEventListener("change", ()=>document.getElementById("cardData").style.display="block");
});

document.getElementById("categoriaSelect").addEventListener("change", function(){
    const cat=this.value;
    const container=document.getElementById("piattiContainer");
    container.innerHTML="";
    if(!cat) return;
    const filtered = mealsData.filter(m=>m.strCategory===cat);
    filtered.forEach(m=>{
        const card=document.createElement("div"); card.classList.add("card","card-small","text-center");
        card.innerHTML=`<img src="${m.strMealThumb}" class="card-img-top" alt="${m.strMeal}">
        <div class="card-body p-2">
            <div class='form-check'>
                <input type='checkbox' class='form-check-input' id='piatto_${m.idMeal}' value='${m.strMeal}'>
                <label class='form-check-label' for='piatto_${m.idMeal}'>${m.strMeal}</label>
            </div>
        </div>`;
        container.appendChild(card);
    });
});

function Registrati(){
    const password=document.getElementById("password").value;
    const conferma=document.getElementById("confermaPassword").value;
    if(password!==conferma){ alert("Le password non coincidono!"); return; }

    let data={email:document.getElementById("email").value,password};
    if(userType==="cliente"){
        const preferenze=[]; document.querySelectorAll("#preferenzeContainer input[type=checkbox]").forEach(cb=>{if(cb.checked) preferenze.push(cb.nextElementSibling.textContent);});
        const pagamento=document.querySelector("input[name=pagamento]:checked")?.value||null;
        const datiCarta={numero:document.getElementById("numeroCarta").value, cvv:document.getElementById("cvv").value};
        data={...data,nome:document.getElementById("nome").value,cognome:document.getElementById("cognome").value,preferenze,pagamento,datiCarta};
    } else {
        const categoria=document.getElementById("categoriaSelect").value;
        const piatti=Array.from(document.querySelectorAll("#piattiContainer input[type=checkbox]:checked")).map(cb=>cb.value);
        data={...data,nomeRistorante:document.getElementById("nomeRistorante").value,piva:document.getElementById("piva").value,telefono:document.getElementById("telefono").value,categoria,piatti};
    }

    const endpoint=userType==="cliente"?"/cliente":"/ristoratore";
    fetch("http://localhost:3000"+endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)})
    .then(r=>r.json())
    .then(res=>{if(res._id){alert("Registrazione avvenuta!"); window.location.href="login.html";} else alert("Errore registrazione");})
    .catch(err=>{console.error(err); alert("Errore connessione server");});
}
