import assert from 'node:assert/strict';
import test from 'node:test';
import {readJSON} from '../sponsor-api-utils.js';

test('JSON limit counts streamed bytes and preserves split UTF-8 characters', async () => {
  const bytes = new TextEncoder().encode('{"x":"Ө"}');
  const request = () => new Request('https://example.test', {
    method: 'POST', duplex: 'half',
    body: new ReadableStream({start(controller) {
      controller.enqueue(bytes.slice(0, 7));
      controller.enqueue(bytes.slice(7));
      controller.close();
    }})
  });
  assert.deepEqual(await readJSON(request(), bytes.length), {x: 'Ө'});
  await assert.rejects(readJSON(request(), bytes.length - 1), /хэтэрсэн/);
});
