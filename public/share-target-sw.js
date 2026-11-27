const SHARED_CACHE = 'imagejoin-shared-files';

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname === '/share-target' && event.request.method === 'POST') {
        event.respondWith(
            (async () => {
                const formData = await event.request.formData();
                const files = formData.getAll('images');
                const cache = await caches.open(SHARED_CACHE);
                const keys = await cache.keys();
                await Promise.all(keys.map((key) => cache.delete(key)));

                let index = 0;
                for (const entry of files) {
                    if (entry instanceof File) {
                        const headers = new Headers({
                            'Content-Type': entry.type || 'image/png',
                            'X-Shared-Filename': encodeURIComponent(entry.name || `shared-${index}.png`),
                        });
                        await cache.put(`/shared-file/${index}`, new Response(entry, { headers }));
                        index += 1;
                    }
                }

                return Response.redirect('/?shared=1', 303);
            })(),
        );
    }
});
