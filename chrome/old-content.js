function* xpathIterable(result) {
  for (let i = 0; i < result.snapshotLength; i++) {
    yield result.snapshotItem(i);
  }
}

function commentId(node) {
  const url = node.getAttribute('data-permalink');
  return url.split('/').reverse()[1];
}

async function update() {
  const comments = [];
  for (const comment of document.querySelectorAll('.deleted.comment')) {
    comments.push(comment);
    if (20 <= comments.length) {
      break;
    }
  }

  const ids = comments.map(commentId);
  if (!ids.length) {
    return;
  }

  for (const comment of comments) {
    comment.classList.remove('deleted');
    comment.querySelector('.entry').classList.add('unreddit-deleted');
  }

  const results = await (await fetch(
    `https://api.pushshift.io/reddit/comment/search?ids=${ids}`,
  )).json();

  const byId = new Map();
  for (const result of results.data) {
    byId.set(result.id, result);
  }

  for (const comment of comments) {
    const data = byId.get(commentId(comment));
    if (!data) {
      continue;
    }

    const deleted = comment.querySelector('em');
    deleted.insertAdjacentHTML(
      'afterend',
      `
      <a href="https://old.reddit.com/user/${
        data.author
      }" class="author may-blank">${data.author}</a>
    `,
    );
    deleted.parentNode.removeChild(deleted);

    const usertext = comment.querySelector('.usertext');
    usertext.insertAdjacentHTML(
      'afterend',
      `
      <form action="#" class="usertext warn-on-unload" onsubmit="return post_form(this, 'editusertext')">
        <input type="hidden" name="thing_id" value="t1_${commentId(comment)}">
        <div class="usertext-body may-blank-within md-container ">
          <div class="md">
            ${data.body
              .split('\n')
              .map(line => `<p>${line}</p>`)
              .join('\n')}
          </div>
        </div>
      </form>
    `,
    );
    usertext.parentNode.removeChild(usertext);
  }
}

var timeout;
var observer = new MutationObserver(function schedule() {
  if (timeout !== undefined) {
    return;
  }
  timeout = setTimeout(async () => {
    await update();
    timeout = undefined;
    schedule();
  }, 0);
});
observer.observe(document, { childList: true, subtree: true });

update();
