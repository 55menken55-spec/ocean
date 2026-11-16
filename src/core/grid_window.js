/* ================= СКРОЛЛЯЩЕЕСЯ ОКНО КАРТЫ (МИР БЕЗ КРАЯ) ================= */
/* Батиметрическая мини-карта и текстура прибоя когда-то считались «на весь
   мир»: фиксированный круг радиусом worldRadius, одна сетка на карту. В мире
   без края это невозможно — карта бесконечна, — но и пересчитывать окно целиком
   при каждом движении игрока нельзя: один пиксель стоит вызов getHeight, а
   полных сеток десятки тысяч (сотни миллисекунд на кадр).

   Окно решает это так же, как прокрутка в навигаторе: центр привязан к сетке
   пикселей, при сдвиге готовые пиксели переезжают на свои новые места (это
   корректно: пиксель описывает точку мира, а не место на экране), и только
   открывшаяся полоса считается заново — причём порциями, по бюджету времени
   на кадр. Игрок плывёт со скоростью метров в секунду, поэтому новая полоса
   успевает заполниться раньше, чем появится следующая.

   Используется мини-картой (src/ui/minimap.js) и текстурой прибоя
   (src/engine/world/textures.js). */
window.OC = window.OC || {};
OC.GridWindow = (function (OC) {
  'use strict';

  const FILL_CHUNK = 16;   // пикселей за один замер бюджета

  const now = (typeof performance !== 'undefined' && performance.now)
    ? () => performance.now()
    : () => Date.now();

  /* opts: { size, span, fillRow, unknown }
     unknown — чем заливать пиксели, которых ещё нет (тёмная «необследованная
     вода»); они заполняются по мере движения.
     size    — сторона сетки в пикселях;
     span    — размер окна в метрах мира (шаг ячейки = span / size);
     fillRow(data, j, i0, i1, cx, cz, cell) — заполнить пиксели [i0, i1)
               строки j; центр пикселя (i, j) имеет мировые координаты
               cx + (i + 0.5 - size / 2) * cell, cz + (j + 0.5 - size / 2) * cell. */
  function create(opts) {
    const size = opts.size | 0;
    const span = opts.span;
    const fillRow = opts.fillRow;
    const unk = opts.unknown || [6, 14, 26, 255];
    const cell = span / size;
    const data = new Uint8Array(size * size * 4);
    const rowA = new Int32Array(size).fill(-1);   // [rowA, rowB) — незаполненный интервал строки
    const rowB = new Int32Array(size);
    const tmpRow = new Uint8Array(size * 4);
    let cx = 0;
    let cz = 0;
    let cursor = 0;      // откуда продолжать заполнение в следующий раз
    let pending = 0;     // сколько строк ждут заполнения
    let changed = true;  // данные менялись с прошлой выгрузки в текстуру

    function markRow(j, i0, i1) {
      if (i1 <= i0) return;
      if (rowA[j] < 0) {
        rowA[j] = i0;
        rowB[j] = i1;
        pending++;
      } else {
        const a = rowA[j] < i0 ? rowA[j] : i0;
        const b = rowB[j] > i1 ? rowB[j] : i1;
        if (a !== rowA[j] || b !== rowB[j]) {
          rowA[j] = a;
          rowB[j] = b;
          changed = true;
        }
      }
      changed = true;
    }

    function markRect(j0, j1, i0, i1) {
      for (let j = Math.max(0, j0); j < Math.min(size, j1); j++) markRow(j, i0, i1);
    }

    function markAll() {
      markRect(0, size, 0, size);
    }

    /* Сдвиг готовых пикселей: точка мира, описанная пикселем (i, j), после
       переноса центра на (dx, dz) пикселей описывается пикселем (i - dx, j - dz). */
    function scroll(dx, dz) {
      if (dz !== 0) {
        /* Строка j берёт данные из j + dz, поэтому идём от «дальнего» края:
           при dz > 0 источник ниже и ещё не тронут, при dz < 0 — выше. */
        const step = dz > 0 ? 1 : -1;
        const jStart = dz > 0 ? 0 : size - 1;
        for (let n = 0; n < size; n++) {
          const j = jStart + step * n;
          const src = j + dz;
          if (src < 0 || src >= size) {
            fillUnknownRow(j);
            continue;
          }
          shiftRow(src, dx, tmpRow);
          data.set(tmpRow, j * size * 4);
        }
      } else {
        for (let j = 0; j < size; j++) {
          shiftRow(j, dx, tmpRow);
          data.set(tmpRow, j * size * 4);
        }
      }
      changed = true;
    }

    function shiftRow(j, dx, out) {
      const base = j * size * 4;
      if (dx === 0) {
        out.set(data.subarray(base, base + size * 4));
        return;
      }
      for (let i = 0; i < size; i++) {
        out[i * 4] = unk[0];
        out[i * 4 + 1] = unk[1];
        out[i * 4 + 2] = unk[2];
        out[i * 4 + 3] = unk[3];
      }
      for (let i = 0; i < size; i++) {
        const src = i + dx;
        if (src < 0 || src >= size) continue;
        const s = base + src * 4;
        const d = i * 4;
        out[d] = data[s];
        out[d + 1] = data[s + 1];
        out[d + 2] = data[s + 2];
        out[d + 3] = data[s + 3];
      }
    }

    function fillUnknownRow(j) {
      const base = j * size * 4;
      for (let i = 0; i < size; i++) {
        const p = base + i * 4;
        data[p] = unk[0];
        data[p + 1] = unk[1];
        data[p + 2] = unk[2];
        data[p + 3] = unk[3];
      }
    }

    function snapCenter(x, z) {
      cx = Math.round(x / cell) * cell;
      cz = Math.round(z / cell) * cell;
    }

    // Свежее окно целиком «необследованное»: всё стоит в очередь на просчёт
    markAll();

    return {
      size: size,
      span: span,
      cell: cell,
      data: data,

      /* Перенос центра. Возвращает true, если окно сдвинулось. */
      setCenter(x, z) {
        const dx = Math.round((x - cx) / cell);
        const dz = Math.round((z - cz) / cell);
        if (dx === 0 && dz === 0) return false;
        cx += dx * cell;
        cz += dz * cell;
        if (Math.abs(dx) >= size || Math.abs(dz) >= size) {
          // Прыжок дальше окна (телепорт, смена биома): содержимое целиком не годится
          for (let j = 0; j < size; j++) fillUnknownRow(j);
          markAll();
          return true;
        }
        scroll(dx, dz);
        if (dz > 0) markRect(size - dz, size, 0, size);
        else if (dz < 0) markRect(0, -dz, 0, size);
        if (dx > 0) markRect(0, size, size - dx, size);
        else if (dx < 0) markRect(0, size, 0, -dx);
        return true;
      },

      /* Сброс к пустому окну (смена биома) — всё считается заново. */
      clear() {
        for (let j = 0; j < size; j++) fillUnknownRow(j);
        cx = 0;
        cz = 0;
        cursor = 0;
        pending = 0;
        rowA.fill(-1);
        markAll();
        snapCenter(0, 0);
      },

      /* Поставить центр без перерисовки данных (первичная установка). */
      resetCenter(x, z) {
        snapCenter(x, z);
        for (let j = 0; j < size; j++) fillUnknownRow(j);
        cursor = 0;
        pending = 0;
        rowA.fill(-1);
        markAll();
      },

      /* Заполнить открывшиеся полосы, уложившись в budgetMs. Строка считается
         кусками по FILL_CHUNK пикселей: иначе одна длинная строка не влезает в
         бюджет и кадр всё равно получает лишние миллисекунды.
         Возвращает true, если работа ещё осталась. */
      tick(budgetMs) {
        if (pending <= 0) return false;
        const t0 = now();
        const limit = budgetMs === undefined ? 2.0 : budgetMs;
        let scanned = 0;
        while (pending > 0 && scanned < size) {
          const j = cursor;
          if (rowA[j] < 0) {
            cursor = cursor + 1 >= size ? 0 : cursor + 1;
            scanned++;
            continue;
          }
          let i = rowA[j];
          const end = rowB[j];
          while (i < end) {
            const stop = end < i + FILL_CHUNK ? end : i + FILL_CHUNK;
            fillRow(data, j, i, stop, cx, cz, cell);
            i = stop;
            if (now() - t0 > limit) break;
          }
          changed = true;
          if (i >= end) {
            rowA[j] = -1;
            pending--;
            cursor = cursor + 1 >= size ? 0 : cursor + 1;
            scanned++;
          }
          if (now() - t0 > limit) break;
        }
        return pending > 0;
      },

      /* Досчитать всё сразу (тестам и первичной сборке нужен готовый кадр). */
      flush() {
        while (this.tick(1e9)) { /* считаем до полной готовности */ }
      },

      centerX() { return cx; },
      centerZ() { return cz; },
      isComplete() { return pending <= 0; },
      pendingRows() { return pending; },

      /* Были ли изменения с прошлой выгрузки в текстуру/канвас. */
      consumeChanged() {
        const v = changed;
        changed = false;
        return v;
      },

      /* Значение окна в мировых координатах (для диагностики и тестов). */
      pixelAt(wx, wz) {
        const i = Math.floor((wx - cx) / cell + size / 2);
        const j = Math.floor((wz - cz) / cell + size / 2);
        if (i < 0 || j < 0 || i >= size || j >= size) return null;
        const p = (j * size + i) * 4;
        return [data[p], data[p + 1], data[p + 2], data[p + 3]];
      }
    };
  }

  return { create };
})(window.OC);
