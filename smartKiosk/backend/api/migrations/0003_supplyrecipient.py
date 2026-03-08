from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_bannerimage_repeat_yearly'),
    ]

    operations = [
        migrations.CreateModel(
            name='SupplyRecipient',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('email', models.EmailField(max_length=254, unique=True)),
            ],
            options={
                'db_table': 'api_supplyrecipient',
            },
        ),
    ]
