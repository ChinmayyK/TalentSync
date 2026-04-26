import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';

export function renderTemplate(
  templateName: string,
  context: Record<string, any>,
) {
  const file = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
  if (!fs.existsSync(file))
    throw new Error('Template not found: ' + templateName);
  const raw = fs.readFileSync(file, 'utf8');
  const tpl = Handlebars.compile(raw);
  const content = tpl(context);

  // templates include Subject: first line; split subject and body
  const [subjectLine, ...bodyLines] = content.split('\n');
  const subject = subjectLine.replace(/^Subject:\s*/i, '').trim();
  const body = bodyLines.join('\n').trim();

  return { subject, body };
}
