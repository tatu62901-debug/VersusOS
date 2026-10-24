import { exigirAdmin } from '@/lib/permissoes';
import FormCampeonato from '@/app/admin/FormCampeonato';
import { ui } from '@/lib/ui';

export default async function NovoCampeonatoPage() {
  await exigirAdmin();

  return (
    <section className={`${ui.card} max-w-2xl`}>
      <h2 className="text-lg font-bold mb-6">Novo campeonato</h2>
      <FormCampeonato />
    </section>
  );
}
