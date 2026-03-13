import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import List

class Mailer:
	def __init__(self, smtp_server: str, smtp_port: int, smtp_username: str, smtp_password: str, smtp_from: str):
		self.smtp_server = smtp_server
		self.smtp_port = smtp_port
		self.smtp_username = smtp_username
		self.smtp_password = smtp_password
		self.smtp_from = smtp_from

	def send_email(self, to: List[str], subject: str, html_body: str, pdf_bytes: bytes = None, excel_bytes: bytes = None):
		msg = MIMEMultipart()
		msg['From'] = self.smtp_from
		msg['To'] = ', '.join(to)
		msg['Subject'] = subject

		msg.attach(MIMEText(html_body, 'html'))

		if pdf_bytes:
			part = MIMEApplication(pdf_bytes, Name="reporte.pdf")
			part['Content-Disposition'] = 'attachment; filename="reporte.pdf"'
			msg.attach(part)

		if excel_bytes:
			part = MIMEApplication(excel_bytes, Name="reporte.xlsx")
			part['Content-Disposition'] = 'attachment; filename="reporte.xlsx"'
			msg.attach(part)

		with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
			server.starttls()
			server.login(self.smtp_username, self.smtp_password)
			server.sendmail(self.smtp_from, to, msg.as_string())
