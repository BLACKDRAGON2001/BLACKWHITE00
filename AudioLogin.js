function changeText(isSuccessful) {
    const messageBox = document.getElementById("MessageBox");
    if (isSuccessful) {
        messageBox.textContent = "LOGIN SUCCESSFUL";
    } else {
        messageBox.textContent = "LOGIN UNSUCCESSFUL";
    }
}

function clearInputFields() {
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("MessageBox").textContent = "";
}

// Hardcoded credentials for demonstration
const correctUsername = "Morningstar00";
const correctPassword = "Supremacus@29$$$";
const otherUsername = "Valentinean00";
const otherPassword = "Administrator@20$$$";
const LoginTimeout = 50 * 60 * 1000; // 50 minutes in milliseconds

function checkLoginStatus() {
    const homeLoginTime = localStorage.getItem("HomeLoginTime");
    const disguiseLoginTime = localStorage.getItem("DisguiseLoginTime");
    const loginPage = document.getElementById("LoginPage");
    const homePage = document.getElementById("HomePage");
    const disguisePage = document.getElementById("DisguisePage");
    const currentTime = new Date().getTime();

    let isHomeValid = false;
    let isDisguiseValid = false;

    if (homeLoginTime) {
        if (currentTime - parseInt(homeLoginTime) < LoginTimeout) {
            isHomeValid = true;
        } else {
            localStorage.removeItem("HomeLoginTime");
        }
    }

    if (disguiseLoginTime) {
        if (currentTime - parseInt(disguiseLoginTime) < LoginTimeout) {
            isDisguiseValid = true;
        } else {
            localStorage.removeItem("DisguiseLoginTime");
        }
    }

    if (isHomeValid) {
        loginPage.style.display = "none";
        homePage.style.display = "block";
        disguisePage.style.display = "none";
        document.body.style.backgroundColor = "black";
    } else if (isDisguiseValid) {
        loginPage.style.display = "none";
        homePage.style.display = "none";
        disguisePage.style.display = "block";
        document.body.style.backgroundColor = "black";
    } else {
        loginPage.style.display = "block";
        homePage.style.display = "none";
        disguisePage.style.display = "none";
        document.body.style.backgroundColor = "white";
    }
}

document.getElementById("signinBtn").addEventListener("click", function () {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === correctUsername && password === correctPassword) {
        localStorage.setItem("HomeLoginTime", new Date().getTime());
        localStorage.removeItem("DisguiseLoginTime");
        document.getElementById("LoginPage").style.display = "none";
        clearInputFields();
        changeText(true);
        document.getElementById("HomePage").style.display = "block";
        document.body.style.backgroundColor = "black";
    } else if (username === otherUsername && password == otherPassword) {
        localStorage.setItem("DisguiseLoginTime", new Date().getTime());
        localStorage.removeItem("HomeLoginTime");
        document.getElementById("LoginPage").style.display = "none";
        clearInputFields();
        changeText(true);
        document.getElementById("DisguisePage").style.display = "block";
        document.body.style.backgroundColor = "black";
    } else {
        changeText(false);
    }
});

document.addEventListener("DOMContentLoaded", checkLoginStatus);

function refreshPage() {
    location.reload();
}

document.getElementById("title").addEventListener("click", function() {
    document.getElementById("HomePage").style.display = "none";
    document.getElementById("LoginPage").style.display = "block";
    localStorage.removeItem("HomeLoginTime");
    document.body.style.backgroundColor = "white";
    clearInputFields();
    refreshPage();
});

document.getElementById("title2").addEventListener("click", function() {
    document.getElementById("DisguisePage").style.display = "none";
    document.getElementById("LoginPage").style.display = "block";
    localStorage.removeItem("DisguiseLoginTime");
    document.body.style.backgroundColor = "white";
    clearInputFields();
    refreshPage();
});