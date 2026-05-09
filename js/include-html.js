function includeHTML() {
    const elements = document.querySelectorAll('[data-include]');
    elements.forEach(element => {
        const filePath = 'includes/' + element.getAttribute('data-include');
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    element.innerHTML = xhr.responseText;
                } else {
                    console.error('Include HTML Error:', xhr.statusText);
                }
            }
        };
        xhr.open('GET', filePath, true);
        xhr.send();
    });
}

document.addEventListener('DOMContentLoaded', includeHTML);