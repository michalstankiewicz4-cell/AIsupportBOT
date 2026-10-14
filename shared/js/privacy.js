// Anonimizacja tekstu przed zapisem w rejestrze rozmów.
// Usuwa to, co najczęściej identyfikuje osobę: adresy e-mail, numery PESEL,
// telefony, numery kont i kart (każdy ciąg co najmniej 7 cyfr, także ze spacjami lub myślnikami).
// Działa w przeglądarce i w Workerze — zapis jest anonimizowany po obu stronach.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Ciąg cyfr przedzielonych spacjami, myślnikami lub kropkami, łącznie min. 7 cyfr (+48 na początku opcjonalnie).
const LONG_NUMBER = /(?:\+\d{1,3}[\s-]?)?\d(?:[\s.-]?\d){6,}/g;

export function anonymize(text, max = 500) {
  return String(text || '')
    .replace(EMAIL, '[e-mail]')
    .replace(LONG_NUMBER, '[numer]')
    .slice(0, max);
}
