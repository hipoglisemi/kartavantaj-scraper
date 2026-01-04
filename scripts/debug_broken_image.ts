
async function debug() {
    const url = "https://cppayemlaxblidgslfit.supabase.co/storage/v1/object/public/campaign-images/chippin/kahve-dunyasinda-250-tl-ve-uzeri-alisveriste-25-tl-1767555894948.png";
    console.log(`🔍 Inspecting: ${url}`);

    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    console.log(`Content-Length: ${res.headers.get('content-length')}`);

    if (res.ok) {
        const buff = await res.arrayBuffer();
        console.log(`Bytes: ${buff.byteLength}`);
        const hex = Buffer.from(buff.slice(0, 8)).toString('hex');
        console.log(`Magic Bytes: ${hex}`); // 89504e47 for PNG
    }
}

debug();
