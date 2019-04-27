function* xpathIterable(result) {
  for (let i = 0; i < result.snapshotLength; i++) {
    yield result.snapshotItem(i);
  }
}

function commentId(node) {
  const url = node.querySelector('a').href;
  return url.split('/').reverse()[1];
}

async function update() {
  const commentIterable = xpathIterable(
    document.evaluate(
      '//*[*/*/*[contains(text(), "Comment removed by moderator")]]',
      document,
      undefined,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    ),
  );
  const comments = [];
  for (const comment of commentIterable) {
    comments.push(comment);
    if (20 <= comments.length) {
      break;
    }
  }
  if (!comments.length) {
    return;
  }

  for (const comment of comments) {
    comment.classList.add('unreddit-deleted');
  }

  const ids = comments.map(commentId);

  function createButton(type) {
    const button = document.createElement('button');
    button.classList.add('unreddit-button');
    const div = document.createElement('div');
    div.classList.add('unreddit-button-content');
    const i = document.createElement('i');
    i.classList.add('icon', `icon-${type}`);
    div.appendChild(i);
    button.appendChild(div);
    return button;
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

    const link = comment.querySelector('a');

    while (comment.hasChildNodes()) {
      comment.removeChild(comment.firstChild);
    }

    {
      const controls = document.createElement('div');
      controls.classList.add('unreddit-controls');

      controls.appendChild(createButton('upvote'));
      controls.appendChild(createButton('downvote'));

      comment.appendChild(controls);
    }

    const main = document.createElement('div');
    main.classList.add('unreddit-main');

    {
      const title = document.createElement('div');
      title.classList.add('unreddit-title');

      {
        const username = document.createElement('div');
        username.classList.add('unreddit-username');

        {
          const a = document.createElement('a');
          a.href = `/user/${data.author}`;

          a.appendChild(document.createTextNode(`/u/${data.author}`));

          username.appendChild(a);
        }

        title.appendChild(username);
      }

      {
        const metric = document.createElement('div');
        metric.classList.add('unreddit-metric');
        metric.appendChild(document.createTextNode(`${data.score} points`));
        title.appendChild(metric);
      }

      title.appendChild(link);

      main.appendChild(title);
    }

    {
      const content = document.createElement('div');
      content.classList.add('unreddit-content');

      for (const line of data.body.split('\n')) {
        const p = document.createElement('p');
        p.innerHTML = line;
        p.classList.add('unreddit-paragraph');
        content.appendChild(p);
      }

      main.appendChild(content);
    }

    comment.appendChild(main);
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
