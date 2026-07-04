import type { TemplateData } from '@/types';

export const templates: TemplateData[] = [
  {
    id: 'resume',
    name: 'Resume',
    description: 'Professional resume with sections for experience, education, and skills',
    icon: 'file-user',
    category: 'professional',
  },
  {
    id: 'invoice',
    name: 'Invoice',
    description: 'Business invoice with itemized billing and payment details',
    icon: 'receipt',
    category: 'business',
  },
  {
    id: 'report',
    name: 'Report',
    description: 'Formal business report with executive summary and analysis',
    icon: 'file-bar-chart',
    category: 'business',
  },
];

export function getResumeHTML(): string {
  return `<h1>John Smith</h1>
<p style="text-align: center;">john.smith@email.com | (555) 123-4567 | New York, NY | linkedin.com/in/johnsmith</p>
<h2>Professional Summary</h2>
<p>Results-driven software engineer with 5+ years of experience in full-stack development. Proven track record of delivering scalable web applications and leading cross-functional teams. Passionate about clean code, user experience, and continuous learning.</p>
<h2>Work Experience</h2>
<h3>Senior Software Engineer</h3>
<p><strong>TechCorp Inc.</strong> | Jan 2021 – Present | New York, NY</p>
<ul>
<li>Led development of microservices architecture serving 2M+ daily active users</li>
<li>Reduced application load time by 40% through performance optimization initiatives</li>
<li>Mentored junior developers and conducted 50+ code reviews per month</li>
<li>Collaborated with product and design teams to deliver features on schedule</li>
</ul>
<h3>Software Engineer</h3>
<p><strong>StartupXYZ</strong> | Jun 2018 – Dec 2020 | San Francisco, CA</p>
<ul>
<li>Built RESTful APIs and real-time data pipelines using Node.js and PostgreSQL</li>
<li>Implemented CI/CD pipelines reducing deployment time from 2 hours to 15 minutes</li>
<li>Developed responsive React components used across 12 product features</li>
</ul>
<h2>Education</h2>
<h3>Bachelor of Science in Computer Science</h3>
<p><strong>University of Technology</strong> | Graduated May 2018</p>
<ul>
<li>GPA: 3.8/4.0 | Dean's List all semesters</li>
<li>Capstone: Machine Learning-based recommendation system</li>
</ul>
<h2>Skills</h2>
<p><strong>Languages:</strong> JavaScript, TypeScript, Python, Go, SQL</p>
<p><strong>Frameworks:</strong> React, Node.js, Express, Next.js, Django</p>
<p><strong>Tools:</strong> Docker, Kubernetes, AWS, Git, Jenkins, Figma</p>
<h2>Certifications</h2>
<ul>
<li>AWS Certified Solutions Architect – Associate</li>
<li>Google Cloud Professional Data Engineer</li>
</ul>`;
}

export function getInvoiceHTML(): string {
  return `<table style="width: 100%;">
<tbody>
<tr>
<td style="width: 50%;">
<h1>INVOICE</h1>
<p><strong>Invoice #:</strong> INV-2024-001</p>
<p><strong>Date:</strong> January 15, 2024</p>
<p><strong>Due Date:</strong> February 15, 2024</p>
</td>
<td style="width: 50%; text-align: right;">
<h2>Your Company Name</h2>
<p>123 Business Street</p>
<p>City, State 12345</p>
<p>contact@company.com</p>
</td>
</tr>
</tbody>
</table>
<hr>
<table style="width: 100%;">
<tbody>
<tr>
<td style="width: 50%;">
<h3>Bill To:</h3>
<p><strong>Client Company</strong></p>
<p>456 Client Avenue</p>
<p>Client City, ST 67890</p>
<p>billing@client.com</p>
</td>
<td style="width: 50%;">
<h3>Ship To:</h3>
<p><strong>Client Company</strong></p>
<p>456 Client Avenue</p>
<p>Client City, ST 67890</p>
</td>
</tr>
</tbody>
</table>
<table style="width: 100%;">
<thead>
<tr>
<th style="width: 40%;">Description</th>
<th style="width: 15%;">Quantity</th>
<th style="width: 20%;">Unit Price</th>
<th style="width: 25%;">Amount</th>
</tr>
</thead>
<tbody>
<tr>
<td>Website Design &amp; Development</td>
<td style="text-align: center;">1</td>
<td style="text-align: right;">$5,000.00</td>
<td style="text-align: right;">$5,000.00</td>
</tr>
<tr>
<td>Logo Design</td>
<td style="text-align: center;">2</td>
<td style="text-align: right;">$750.00</td>
<td style="text-align: right;">$1,500.00</td>
</tr>
<tr>
<td>Content Writing (per page)</td>
<td style="text-align: center;">10</td>
<td style="text-align: right;">$150.00</td>
<td style="text-align: right;">$1,500.00</td>
</tr>
<tr>
<td>SEO Optimization</td>
<td style="text-align: center;">1</td>
<td style="text-align: right;">$2,000.00</td>
<td style="text-align: right;">$2,000.00</td>
</tr>
</tbody>
</table>
<table style="width: 100%;">
<tbody>
<tr>
<td style="width: 60%;"></td>
<td style="width: 20%;"><strong>Subtotal:</strong></td>
<td style="width: 20%; text-align: right;">$10,000.00</td>
</tr>
<tr>
<td></td>
<td><strong>Tax (8%):</strong></td>
<td style="text-align: right;">$800.00</td>
</tr>
<tr>
<td></td>
<td><strong>Total:</strong></td>
<td style="text-align: right;"><strong>$10,800.00</strong></td>
</tr>
</tbody>
</table>
<h3>Payment Terms</h3>
<p>Payment is due within 30 days. Please make checks payable to Your Company Name or use the following payment methods:</p>
<ul>
<li>Bank Transfer: Account #123456789</li>
<li>Online Payment: pay.company.com/INV-2024-001</li>
</ul>
<p style="text-align: center;"><strong>Thank you for your business!</strong></p>`;
}

export function getReportHTML(): string {
  return `<h1 style="text-align: center;">Quarterly Business Report</h1>
<p style="text-align: center;"><strong>Q4 2023 Performance Analysis</strong></p>
<p style="text-align: center;">Prepared by: Jane Doe, Senior Analyst | January 10, 2024</p>
<hr>
<h2>Executive Summary</h2>
<p>This report presents a comprehensive analysis of Q4 2023 performance metrics across all business units. Overall revenue increased by 23% compared to Q3 2023, exceeding our target by 8%. Customer acquisition costs decreased by 15%, while retention rates improved to 94.2%.</p>
<h2>Key Highlights</h2>
<ul>
<li>Revenue: $4.2M (+23% QoQ)</li>
<li>New Customers: 1,240 (+18% QoQ)</li>
<li>Customer Retention: 94.2% (+2.1pp QoQ)</li>
<li>Average Order Value: $285 (+5% QoQ)</li>
<li>Net Promoter Score: 72 (+4 points QoQ)</li>
</ul>
<h2>Revenue Analysis</h2>
<h3>By Product Line</h3>
<table style="width: 100%;">
<thead>
<tr>
<th>Product Line</th>
<th>Q4 Revenue</th>
<th>QoQ Growth</th>
<th>YoY Growth</th>
</tr>
</thead>
<tbody>
<tr>
<td>Enterprise Software</td>
<td style="text-align: right;">$1.8M</td>
<td style="text-align: right;">+28%</td>
<td style="text-align: right;">+45%</td>
</tr>
<tr>
<td>Cloud Services</td>
<td style="text-align: right;">$1.2M</td>
<td style="text-align: right;">+19%</td>
<td style="text-align: right;">+62%</td>
</tr>
<tr>
<td>Professional Services</td>
<td style="text-align: right;">$0.7M</td>
<td style="text-align: right;">+15%</td>
<td style="text-align: right;">+22%</td>
</tr>
<tr>
<td>Support &amp; Maintenance</td>
<td style="text-align: right;">$0.5M</td>
<td style="text-align: right;">+31%</td>
<td style="text-align: right;">+18%</td>
</tr>
</tbody>
</table>
<h3>By Region</h3>
<p>North America continues to be our largest market at 52% of total revenue, followed by Europe at 28% and APAC at 20%. The APAC region showed the strongest growth at 34% QoQ, driven by expansion in Singapore and Australia markets.</p>
<h2>Customer Metrics</h2>
<h3>Acquisition</h3>
<p>We acquired 1,240 new customers in Q4, bringing our total customer base to 8,750. The primary acquisition channels were organic search (35%), partner referrals (25%), and paid social media (20%).</p>
<h3>Retention &amp; Satisfaction</h3>
<p>Customer retention improved to 94.2%, up from 92.1% in Q3. This improvement is attributed to the launch of our new customer success program and enhanced onboarding flow. Our Net Promoter Score increased to 72, placing us in the "excellent" category.</p>
<h2>Operational Efficiency</h2>
<ul>
<li>Customer Acquisition Cost: $142 (-15% QoQ)</li>
<li>Lifetime Value: $4,850 (+8% QoQ)</li>
<li>LTV:CAC Ratio: 34:1</li>
<li>Gross Margin: 78% (+2pp QoQ)</li>
<li>Operating Margin: 24% (+3pp QoQ)</li>
</ul>
<h2>Risk Factors</h2>
<ul>
<li>Increased competition in the mid-market segment</li>
<li>Currency fluctuation impact on European operations</li>
<li>Dependency on key enterprise accounts (top 10 = 35% of revenue)</li>
</ul>
<h2>Q1 2024 Outlook</h2>
<p>Based on current pipeline and market conditions, we project Q1 2024 revenue of $4.5-4.8M, representing 7-14% QoQ growth. Key initiatives include the launch of our AI-powered analytics module and expansion into the Latin American market.</p>
<h2>Recommendations</h2>
<ol>
<li>Invest in APAC sales team to capitalize on growth momentum</li>
<li>Develop mid-market specific pricing tier to address competitive pressure</li>
<li>Implement account diversification strategy to reduce concentration risk</li>
<li>Accelerate AI analytics product launch to Q1 2024</li>
</ol>`;
}

export function getTemplateHTML(templateId: string): string {
  switch (templateId) {
    case 'resume': return getResumeHTML();
    case 'invoice': return getInvoiceHTML();
    case 'report': return getReportHTML();
    default: return '<p></p>';
  }
}
