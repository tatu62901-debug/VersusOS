'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { criarCampeonato, editarCampeonato } from '@/app/admin/actions';
import CampoImagem from '@/app/components/CampoImagem';
import { JOGOS } from '@/lib/regras';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  campeonato?: {
    id: string;
    name: string;
    game: string;
    description: string | null;
    prize: number;
    maxTeams: number;
    startDate: string; // AAAA-MM-DD
    registrationDeadline: string; // AAAA-MM-DD
    imageUrl: string | null;
    travado: boolean; // já iniciado/encerrado/cancelado: jogo, vagas e datas não mudam
  };
};

export default function FormCampeonato({ campeonato }: Props) {
  const acao = campeonato ? editarCampeonato.bind(null, campeonato.id) : criarCampeonato;
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(acao, {});
  const v = estado.valores;

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}
      {estado.sucesso && <div className={ui.sucesso}>{estado.sucesso}</div>}

      {campeonato?.travado && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-lg">
          Este campeonato já foi iniciado, encerrado ou cancelado. Só dá pra editar nome, descrição, premiação e
          imagem (jogo, vagas e datas ficam travados).
        </div>
      )}

      <CampoImagem rotulo="Imagem de capa (opcional)" urlAtual={campeonato?.imageUrl} />

      <div>
        <label htmlFor="name" className={ui.label}>Nome do campeonato</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={60}
          defaultValue={v?.name ?? campeonato?.name ?? ''}
          placeholder="Ex: Copa dos Campeões VALORANT"
          className={ui.campo}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="game" className={ui.label}>Jogo</label>
          <select
            id="game"
            name="game"
            required
            defaultValue={v?.game ?? campeonato?.game ?? ''}
            className={ui.campo}
          >
            <option value="" disabled>Escolha um jogo</option>
            {JOGOS.map((jogo) => (
              <option key={jogo} value={jogo}>{jogo}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="startDate" className={ui.label}>Data de início</label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={v?.startDate ?? campeonato?.startDate ?? ''}
            className={ui.campo}
          />
        </div>
        <div>
          <label htmlFor="registrationDeadline" className={ui.label}>Inscrições até</label>
          <input
            id="registrationDeadline"
            name="registrationDeadline"
            type="date"
            required
            defaultValue={v?.registrationDeadline ?? campeonato?.registrationDeadline ?? ''}
            className={ui.campo}
          />
        </div>
        <div>
          <label htmlFor="prize" className={ui.label}>Premiação (R$)</label>
          <input
            id="prize"
            name="prize"
            type="number"
            required
            min={0}
            max={10000000}
            step={1}
            defaultValue={v?.prize ?? campeonato?.prize ?? ''}
            placeholder="Ex: 5000"
            className={ui.campo}
          />
        </div>
        <div>
          <label htmlFor="maxTeams" className={ui.label}>Máximo de times</label>
          <input
            id="maxTeams"
            name="maxTeams"
            type="number"
            required
            min={2}
            max={128}
            step={1}
            defaultValue={v?.maxTeams ?? campeonato?.maxTeams ?? ''}
            placeholder="Ex: 16"
            className={ui.campo}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={ui.label}>Descrição (opcional)</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={300}
          defaultValue={v?.description ?? campeonato?.description ?? ''}
          placeholder="Formato, regras, transmissão..."
          className={ui.campo}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={pendente} className={ui.botaoPrimario}>
          {pendente ? 'Salvando...' : campeonato ? 'Salvar alterações' : 'Criar campeonato'}
        </button>
        <Link href="/admin/campeonatos" className={ui.botaoSecundario}>
          {campeonato ? 'Voltar' : 'Cancelar'}
        </Link>
      </div>
    </form>
  );
}
