# Ateliê Arcano — Água V12.7

Esta versão modifica diretamente a aba **💧 Água** do laboratório sem substituir suas bibliotecas de magias.

## Correções

- **Poças e lagoa de verdade:** a simulação começa com a lâmina superficial zerada; a chuva alimenta a superfície, infiltra na terra e escoa pelas diferenças de altura. As bacias foram aprofundadas para favorecer a acumulação. A renderização só mostra água azulada quando há lâmina suficiente para formar uma poça; água muito rasa deixa o terreno escuro e molhado.
- **Formação progressiva:** time-lapse inicial 4× (disponível também 1×, 16× e 64×); o botão **Recomeçar** volta a zero. O modo **Lagoa** usa chuva mais forte e mostra o enchimento pelo relevo.
- **Cena limpa:** botão **⛶ Ver cena** esconde os painéis do topo, as configurações e as métricas; um botão **☷ Mostrar ajustes** volta a exibi-los. A simulação não para quando os controles estão ocultos.
- **Tipo de terra:** opções terra comum/franca, argilosa/barro e compactada modificam permeabilidade e capacidade de armazenar água.
- **Respingos de gotas:** terra seca lança poucas partículas marrons; terra úmida e argila produzem mais partículas de barro; uma poça dá origem a gotículas azuladas e a uma ondulação.
- **Ondulações conformes ao terreno:** os anéis têm sua geometria atualizada em cada quadro por interpolação bilinear da altura do terreno **e** da água; trechos fora de água ou sobre pedras são cortados, para evitar ondas flutuando.

## Teste reproduzível de física (sem renderização)

No modelo com 54 × 44 células usado no diagnóstico:
- Modo Poças, intensidade 3: área com água acima de 2,2 cm após 5, 10 e 20 segundos **simulados**: aproximadamente 1,0 m², 9,7 m² e 40,7 m².
- Modo Lagoa, intensidade 4: cobertura da bacia principal após 5, 10 e 20 segundos **simulados**: aproximadamente 42%, 67% e 89%.

São indicadores da evolução numérica, **não** um teste visual no Android. As taxas e as escalas são ilustrativas e ajustadas para demonstração; não são previsões hidrológicas reais. O tempo mostrado é simulado e as unidades gráficas são convencionais.

## Arquivos

- `index.html`: menu principal do laboratório, com acesso à aba Água V12.7.
- `agua.html`: interface e controles de visualização.
- `agua-v127.js`: simulação e renderização 3D.
- `agua-v126.js`, `agua-v125.js`, `agua-v124.html`: versões anteriores mantidas.

Requer WebGL e conexão ao CDN de Three.js. No celular, recomenda-se Chrome atualizado com WebGL habilitado.
