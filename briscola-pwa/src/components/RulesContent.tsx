export function RulesContent() {
  return (
    <div className="rules-copy">
      <section>
        <h3>Obiettivo</h3>
        <p>
          Cattura più punti dell’avversario. Ogni carta ha un valore: Asso 11, Tre 10, Re 4, Cavallo 3,
          Fante 2. Le altre carte valgono zero. In totale, nel mazzo ci sono 120 punti.
        </p>
      </section>
      <section>
        <h3>Prendere</h3>
        <p>
          La Briscola è la carta scoperta sotto il mazzo. Batte qualsiasi carta di altro seme. Se due carte
          sono dello stesso seme vince quella più forte: Asso, Tre, Re, Cavallo, Fante, Sette, Sei, Cinque,
          Quattro, Due.
        </p>
      </section>
      <section>
        <h3>La mano</h3>
        <p>
          Si parte con tre carte a testa. Chi vince la presa pesca per primo, poi pesca l’avversario. Quando
          il mazzo finisce si giocano le ultime carte in mano. Non sei obbligato a rispondere al seme.
        </p>
      </section>
      <section>
        <h3>Online</h3>
        <p>
          Crea una stanza, condividi il codice a cinque caratteri e attendi l’avversario. Le carte sono
          gestite dal server Supabase: il browser riceve solo la tua mano, mai quella dell’avversario.
        </p>
      </section>
    </div>
  );
}
