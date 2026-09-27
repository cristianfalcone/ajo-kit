// happy-dom resolves a computed `direction` from style rules only and ships no
// user-agent stylesheet, so an inherited `dir` never reaches descendants. Add
// the browser's two `dir` rules, as every browser's user-agent stylesheet does.
const style = document.createElement('style')
style.textContent = '[dir="rtl"]{direction:rtl}[dir="ltr"]{direction:ltr}'
document.head.append(style)
