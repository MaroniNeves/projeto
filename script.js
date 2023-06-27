document.querySelector('#file').addEventListener('change', function(){
  document.querySelector('.text').textContent = this.files[0].name;
})

function toggleMode() {
  const html = document.documentElement

  html.classList.toggle("light")
}
