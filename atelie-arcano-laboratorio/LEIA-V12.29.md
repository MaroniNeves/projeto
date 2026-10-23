# Ateliê Arcano V12.29 — vegetação, chuva, solo e aquífero

Versão do **laboratório original** na ramificação `arcano-v12-27-vento-ancoragem-reflexos`. Os sistemas de clima, vento, água, reflexos, física de solo, absorção de nutrientes, qualidade gráfica e paisagem foram preservados e incrementados.

## Mudanças efetivamente aplicadas

1. **Orientação da vegetação:** critério mais rigoroso para detectar árvores com troncos horizontalizados, mantendo as copas largas legítimas.
2. **Grama original:** quando há GLTF/FBX de gramínea carregado, os triângulos procedurais deixam de aparecer; cada moita reúne quatro cópias pequenas do asset original.
3. **Rochas reais:** mantém as malhas Quaternius já utilizadas e adiciona textura mineral granulada de fallback. Em Alta/Equilibrada, tenta o mapa original `Rocks.png` da fonte oficial.
4. **Exposição:** reduz exposição ACES e intensidades da luz hemisférica/direcional, inclusive na ausência de chuva.
5. **Garoa:** aumenta a visibilidade das gotas e assegura uma precipitação mínima real quando o usuário seleciona garoa/chuva fraca, mesmo com um campo atmosférico esparso.
6. **Ondas:** mantém gotas 3D, impactos e anéis, troca reflexos pontilhados por cristas contínuas com movimento e reflexos preservados.
7. **Horizontes do solo:** seção didática econômica com camadas O, A, B, C, zona saturada (aquífero) e rocha-matriz sob o terreno.
8. **Textura do terreno:** granulação baseada em classes de solo já presentes no sistema, com resolução conforme perfil gráfico. Na qualidade Alta, tenta automaticamente um mapa difuso de solo real **CC0 Poly Haven** (1K), mantendo textura local se a rede falhar. Em qualidade baixa mantém a aparência simples anterior.
9. **Hidrologia:** reforço limitado da infiltração durante chuvas fortes **apenas enquanto houver capacidade disponível no solo**; fluxo lateral da água subterrânea e exsudação em depressões adequadas, sem gerar inundação em toda a paisagem.
10. **Água interceptada por árvores:** folhas/troncos escurecem discretamente quando molhados; após cessar a chuva, gotas são retiradas da água efetivamente retida nas copas, caem e voltam à água superficial/solo até a reserva secar.

## Limitações de validação

- As equações são didáticas/visuais e **não calibradas em mm/h ou hidrogeologia real**.
- A superfície de água usa ondulações 3D e shaders, não um solver completo de fluidos SPH.
- O desenho de horizontes é simples, propositalmente econômico, e não acompanha a geometria exata de cada microrelevo.
- Os arquivos de solo de alta qualidade são hospedados pelo provedor externo Poly Haven; a textura granular local funciona sem esse download.
- Não foi possível verificar o resultado em GPU Android nesta sessão. A validação realizada foi de sintaxe do JavaScript e integridade dos arquivos no GitHub.

## Licença e fonte adicional de solo

Mapas difusos (CC0) de **Poly Haven**: `dirt_floor`, `dirt_aerial_02`, `gravel_ground_01`.
- https://polyhaven.com/a/dirt
- https://polyhaven.com/

Os modelos de árvores, rochas, folhagens e gramíneas continuam vindo dos pacotes Quaternius fornecidos pelo usuário.

## Teste

Abra `atelie-arcano-laboratorio/agua.html` nesta ramificação pelo Raw.Githack. Examine qualidade Equilibrada e Alta, mude chuva de 0 a temporal e volte a 0 para observar o gotejamento.
