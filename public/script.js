const form = document.getElementById("uploadForm");
const message = document.getElementById("message");
const fileList = document.getElementById("fileList");
const loadBtn = document.getElementById("loadFiles");

window.onload = () => {
    checkLogin();
};

async function checkLogin() {
    const response = await fetch("/user");
    const data = await response.json();

    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (data.authenticated) {
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";
        await loadFiles();
    } else {
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
        fileList.innerHTML = "<li>Please login first.</li>";
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    const response = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    const result = await response.text();
    message.innerText = result;

    await loadFiles();
    form.reset();
});

loadBtn.addEventListener("click", async () => {
    await loadFiles();
});

async function loadFiles() {
    fileList.innerHTML = "";

    const response = await fetch("/files");

    if (!response.ok) {
        fileList.innerHTML = "<li>Please login first.</li>";
        return;
    }

    const files = await response.json();

    files.forEach(file => {
        const li = document.createElement("li");

        li.innerHTML = `
            <strong>${file.Key}</strong><br>
            <small>${Math.round(file.Size / 1024)} KB</small><br><br>

            <button onclick="downloadFile('${file.Key}')">Download</button>
            <button onclick="shareFile('${file.Key}')">Share</button>
        `;

        fileList.appendChild(li);
    });
}

async function shareFile(filename) {
    const response = await fetch(`/share/${encodeURIComponent(filename)}`);
    const data = await response.json();

    await navigator.clipboard.writeText(data.url);
    alert("Share link copied!");
}

async function downloadFile(filename) {
    const response = await fetch(`/download/${encodeURIComponent(filename)}`);
    const data = await response.json();

    window.open(data.url, "_blank");
}